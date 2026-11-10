package formula.bollo.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import java.lang.reflect.Field;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailSendException;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.internet.MimeMessage;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @InjectMocks
    private EmailService emailService;

    @Mock
    private JavaMailSender javaMailSender;

    @Test
    void smtpFailureDoesNotPropagate() {
        ReflectionTestUtils.setField(emailService, "emailFrom", "noreply@example.com");
        MimeMessage message = mock(MimeMessage.class);
        when(javaMailSender.createMimeMessage()).thenReturn(message);
        doThrow(new MailSendException("SMTP caido")).when(javaMailSender).send(message);

        assertDoesNotThrow(() -> emailService.sendSimpleMessage("email@mail.com", "Subject", "texto"));
        verify(javaMailSender).send(message);
    }

    @Test
    void sendSimpleMessageFail()
            throws IllegalArgumentException, IllegalAccessException, NoSuchFieldException, SecurityException {
        Field field = EmailService.class.getDeclaredField("emailFrom");
        field.setAccessible(true);
        field.set(emailService, "noreply@example.com");

        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendSimpleMessage("email@mail.com", "Subject", "texto");

        verify(javaMailSender, times(1)).send(any(MimeMessage.class));
    }
}
