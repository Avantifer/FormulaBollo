package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.TimeBasedRollingPolicy;
import ch.qos.logback.core.util.FileSize;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.parallel.Isolated;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

// This test reconfigures shared logging state and system properties.
@Isolated
class LoggingOpsConfigurationTest {
    @TempDir
    Path temporaryDirectory;

    @ParameterizedTest
    @ValueSource(strings = {"connectiontimeout", "timeout", "writetimeout"})
    void smtpTimeoutIsDefinedAndPositive(String timeout) throws Exception {
        Properties properties = new Properties();
        try (var input = Files.newInputStream(source("main/resources/application.properties"))) {
            properties.load(input);
        }
        String key = "spring.mail.properties.mail.smtp." + timeout;
        String value = properties.getProperty(key);
        assertNotNull(value, key + " must be defined");
        String resolved = new StandardEnvironment().resolveRequiredPlaceholders(value);
        assertTrue(Long.parseLong(resolved) > 0, key + " must be a positive number");
    }

    @Test
    void freshContextUsesSystemLogPathAndRetainsProductionDefault() throws Exception {
        String previous = System.getProperty("LOG_PATH");
        try {
            System.clearProperty("LOG_PATH");
            String defaultFile = configuredActiveFile();
            System.setProperty("LOG_PATH", temporaryDirectory.toString());
            String overriddenFile = configuredActiveFile();

            assertAll(
                    () -> assertEquals(Path.of("/opt/formulabollo/logs").toAbsolutePath().normalize(),
                            Path.of(defaultFile).toAbsolutePath().normalize().getParent()),
                    () -> assertEquals(temporaryDirectory.toAbsolutePath().normalize(),
                            Path.of(overriddenFile).toAbsolutePath().normalize().getParent()));
        } finally {
            if (previous == null) {
                System.clearProperty("LOG_PATH");
            } else {
                System.setProperty("LOG_PATH", previous);
            }
        }
    }

    @Test
    void rollingPolicyHasFinitePositiveTotalSizeCap() throws Exception {
        LoggerContext context = loadWithoutFileIo();
        try {
            TimeBasedRollingPolicy<?> policy = rollingPolicy(context);
            FileSize cap = (FileSize) ReflectionTestUtils.getField(policy, "totalSizeCap");
            assertNotNull(cap);
            assertTrue(cap.getSize() > 0 && cap.getSize() < Long.MAX_VALUE,
                    "Rolling history must have a finite positive totalSizeCap, got " + cap);
        } finally {
            context.stop();
        }
    }

    @Test
    void testLoggingConfigurationExistsAndHasNoFileAppender() throws Exception {
        Path testConfiguration = source("test/resources/logback-test.xml");
        assertTrue(Files.isRegularFile(testConfiguration), "src/test/resources/logback-test.xml must exist");
        Document xml = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(testConfiguration.toFile());
        var appenders = xml.getElementsByTagName("appender");
        for (int i = 0; i < appenders.getLength(); i++) {
            String type = ((Element) appenders.item(i)).getAttribute("class");
            assertFalse(ch.qos.logback.core.FileAppender.class.isAssignableFrom(Class.forName(type)),
                    "Test logging must not use a file appender: " + type);
        }
    }

    private String configuredActiveFile() throws Exception {
        LoggerContext context = loadWithoutFileIo();
        try {
            return rollingPolicy(context).getActiveFileName();
        } finally {
            context.stop();
        }
    }

    private LoggerContext loadWithoutFileIo() throws Exception {
        Document xml = DocumentBuilderFactory.newInstance().newDocumentBuilder()
                .parse(source("main/resources/logback-spring.xml").toFile());
        var appenders = xml.getElementsByTagName("appender");
        for (int i = 0; i < appenders.getLength(); i++) {
            Element appender = (Element) appenders.item(i);
            Class<?> type = Class.forName(appender.getAttribute("class"));
            if (ch.qos.logback.core.FileAppender.class.isAssignableFrom(type)) {
                assertEquals(RollingFileAppender.class, type, "Unexpected file appender: cannot safely probe it");
                appender.setAttribute("class", NonWritingRollingAppender.class.getName());
            }
        }
        // Keep real property resolution and rolling policy configuration. Only disable file opening
        // and asynchronous history deletion in this in-memory copy; /opt must never be written.
        var policies = xml.getElementsByTagName("rollingPolicy");
        for (int i = 0; i < policies.getLength(); i++) {
            Element policy = (Element) policies.item(i);
            var cleanup = policy.getElementsByTagName("cleanHistoryOnStart");
            for (int j = 0; j < cleanup.getLength(); j++) {
                cleanup.item(j).setTextContent("false");
            }
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        TransformerFactory.newInstance().newTransformer().transform(new DOMSource(xml), new StreamResult(bytes));
        LoggerContext context = new LoggerContext();
        try {
            JoranConfigurator configurator = new JoranConfigurator();
            configurator.setContext(context);
            configurator.doConfigure(new ByteArrayInputStream(bytes.toByteArray()));
            assertTrue(context.getStatusManager().getCopyOfStatusList().stream()
                    .noneMatch(status -> status.getLevel() == ch.qos.logback.core.status.Status.ERROR),
                    () -> context.getStatusManager().getCopyOfStatusList().toString());
            return context;
        } catch (Exception | AssertionError failure) {
            context.stop();
            throw failure;
        }
    }

    private TimeBasedRollingPolicy<?> rollingPolicy(LoggerContext context) {
        var appenders = context.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME).iteratorForAppenders();
        while (appenders.hasNext()) {
            var appender = appenders.next();
            if (appender instanceof RollingFileAppender<?> rolling) {
                return assertInstanceOf(TimeBasedRollingPolicy.class, rolling.getRollingPolicy());
            }
        }
        return fail("Expected a rolling file appender on the production root logger");
    }

    private Path source(String relativePath) {
        Path module = Path.of("src");
        if (!Files.isDirectory(module)) {
            module = Path.of("FormulaBolloApp", "src");
        }
        return module.resolve(relativePath);
    }

    public static class NonWritingRollingAppender extends RollingFileAppender<ILoggingEvent> {
        @Override
        public void start() {
            // Joran configures the real rolling policy, but no output stream is ever opened.
        }
    }
}
