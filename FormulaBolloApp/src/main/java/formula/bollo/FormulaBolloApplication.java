package formula.bollo;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class FormulaBolloApplication {

  public static void main(String[] args) {
    new SpringApplicationBuilder()
        .profiles("dev")
        .sources(FormulaBolloApplication.class)
        .run(args);
  }
}
