
namespace theorie_02.Services;

public interface IMailService
{
    void SendEmail(Movie m);
}

public class MailService : IMailService
{
    public void SendEmail(Movie m)
    {

    }
}

public class GoogleMailService : IMailService
{
    public void SendEmail(Movie m)
    {

    }
}