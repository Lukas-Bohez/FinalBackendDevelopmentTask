var builder = WebApplication.CreateBuilder(args);

// 1. Singleton: Mayor (Always the same)
builder.Services.AddSingleton<IMayor, MayorService>();

// 2. Scoped: Customer (Same for the whole visit/request, new one next time)
builder.Services.AddScoped<ICustomer, CustomerService>();

// 3. Transient: Passerby (New random person every single time)
builder.Services.AddTransient<IPasserby, PasserbyService>();

// Helper Service
builder.Services.AddTransient<FrontDeskService>();

// Infrastructure
builder.Services.AddScoped<IAuditRepository, JsonFileAuditRepository>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/people", async (
    IMayor mayor,
    ICustomer customer,
    IPasserby passerby,
    FrontDeskService frontDesk,
    IAuditRepository auditRepo) =>
{
    // 1. Compare Mayor (Singleton)
    var mayorComparison = new Comparison(
        "Mayor (Singleton)",
        "Example: The Mayor of the city. Stays the same forever.",
        mayor.Person.ToString(),
        frontDesk.GetMayor().ToString(),
        mayor.Person.Id == frontDesk.GetMayor().Id ? "YES (Correct)" : "NO (Error)"
    );

    // 2. Compare Customer (Scoped)
    var customerComparison = new Comparison(
        "Customer (Scoped)",
        "Example: The person at the counter. Stays the same while paying (Result + Service), but is a new person next customer.",
        customer.Person.ToString(),
        frontDesk.GetCustomer().ToString(),
        customer.Person.Id == frontDesk.GetCustomer().Id ? "YES (Correct)" : "NO (Error)"
    );

    // 3. Compare Passerby (Transient)
    var passerbyComparison = new Comparison(
        "Passerby (Transient)",
        "Example: Random people walking by. Always a different person.",
        passerby.Person.ToString(),
        frontDesk.GetPasserby().ToString(),
        passerby.Person.Id != frontDesk.GetPasserby().Id ? "NO (Correct)" : "YES (Unlikely)"
    );

    var response = new PersonDemoResponse(mayorComparison, customerComparison, passerbyComparison);

    // Log the visit
    await auditRepo.LogRequestAsync(
        customer.Person.Id.ToString(), 
        $"Served customer {customer.Person.Id} while Mayor is {mayor.Person.Id}");

    return Results.Ok(response);
})
.WithName("GetPeopleLifecycle")
.WithOpenApi();

app.Run();
