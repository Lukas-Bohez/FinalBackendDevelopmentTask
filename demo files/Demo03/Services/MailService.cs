
public interface IMailService
{
    void SendEmail(string email, string subject, string message);
}


public class MailService : IMailService
{
    public void SendEmail(string email, string subject, string message)
    {
        // Send email
    }
}

