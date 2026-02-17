

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddTransient<PersonValidator>();
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapPost("/person", (Person person,PersonValidator personValidator) =>
{
    var validationResult = personValidator.Validate(person);
    if (!validationResult.IsValid)
    {
        return Results.BadRequest(validationResult.Errors);
    }
    return Results.Created("/person", person);
});

app.Run("http://localhost:5000");
