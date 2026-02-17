using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<MailServerSettings>(builder.Configuration.GetSection("MailServerSettings"));
builder.Services.AddTransient<IPersonService, PersonService>();
var app = builder.Build();



app.MapGet("/settings", (IOptions<MailServerSettings> settings) =>
{
    return Results.Ok(settings);
});


app.MapGet("/settings2", () =>
{
    var settings = app.Services.GetRequiredService<IOptions<MailServerSettings>>().Value;
    return Results.Ok(settings);
});




app.MapGet("/", SayHello);

app.MapGet("/hello/{name}", (string name) =>
{
    return $"Hello {name}";
});

app.MapGet("/hello/{name}/{age:int}", (string name, int age) =>
{
    return $"Hello {name}, you are {age} years old";
});

app.MapGet("/hello2/{name}/{age:int}", (string name, int age,bool? includeAddress) =>
{
    if(includeAddress.HasValue)
    {
        return $"Hello {name}, you are {age} years old and you live in New York";
    }
    return $"Hello {name}, you are {age} years old";
});


app.MapPost("/person", (IPersonService personService, Person person) =>
{
    Console.WriteLine($"PersonId: {person.PersonId}");
    personService.AddPerson(person);
    return Results.Created($"/person/{person.PersonId}", person);
});

app.MapPost("/person2", ( Person person) =>
{
    Console.WriteLine($"PersonId: {person.PersonId}");
    var personService = app.Services.GetRequiredService<IPersonService>();
    personService.AddPerson(person);
    return Results.Created($"/person/{person.PersonId}", person);
});




app.MapGet("/person/{id:int}", (int id) =>
{
    var person = new Person
    {
        PersonId = id,
        FirstName = "John",
        LastName = "Doe"
    };
    return Results.Ok(person);
});


string SayHello()
{
    return "Hello World!";
}


app.Run("http://localhost:3000");
