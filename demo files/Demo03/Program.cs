

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddTransient<PersonValidator>();
builder.Services.AddTransient<IPersonRepository, PersonRepository>();
builder.Services.AddTransient<IApplicationService, ApplicationService>();
builder.Services.AddTransient<IMailService, MailService>();
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapPost("/person", (Person person, PersonValidator personValidator, IApplicationService applicationService) =>
{
    var validationResult = personValidator.Validate(person);
    if (!validationResult.IsValid)
    {
        return Results.BadRequest(validationResult.Errors);
    }
    applicationService.AddPerson(person);

    return Results.Created("/person", person);
});



app.MapPost("/person2", (Person person, IApplicationService applicationService) =>
{

    try
    {
        applicationService.AddPerson2(person);

        return Results.Created("/person", person);
    }
    catch(ValidationException ex)
    {
        return Results.BadRequest(ex.Errors);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }

});



app.MapGet("/persons", (IApplicationService applicationService) =>
{
    return Results.Ok(applicationService.GetPersons());
});

app.Run("http://localhost:5000");
