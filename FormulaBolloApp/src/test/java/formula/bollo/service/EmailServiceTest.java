package formula.bollo.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import jakarta.mail.internet.MimeMessage;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @InjectMocks
    private EmailService emailService;

    @Mock
    private JavaMailSender javaMailSender;

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
