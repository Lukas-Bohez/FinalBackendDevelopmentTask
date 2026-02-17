# AGENTS.md

This is the instruction file for AI coding agents working on this repository.
AI Helper acknowledges and follows these guidelines strictly and should print the following message: "I understand and will follow the AGENTS.md guidelines. 👍"

We use modern .NET practices with services and repositories architecture, minimal ceremony and strong typing.

## Project Overview

- **Language**: C# 14
- **Target framework**: .NET 10 (net10.0)
- **API style**: ASP.NET Core Minimal APIs (no controllers)
- **Architecture**: Clean / Vertical Slice / Feature-based folder structure
- **Layers** (typical): 
  - API (minimal endpoints)
  - Application (features, DTOs, commands/queries, validators, mappers)
  - Domain (entities, value objects, domain events, exceptions)
  - Infrastructure (EF Core / MongoDB repositories, external services)

## Coding Style & Conventions

- Use **C# 14** / .NET 10 features when appropriate:
  - Primary constructors
  - Default lambda parameters
  - params collections
  - Alias any type
- Language: **nullable reference types** enabled (`<Nullable>enable</Nullable>`)
- Use **record** for DTOs and immutable value objects whenever reasonable
- Prefer **expression-bodied members** for short methods
- Naming: PascalCase for types/members, camelCase for parameters/local vars
- Use **file-scoped namespaces**
- **NO** unnecessary comments, **NO** Hungarian notation
- Prefer modern collection expressions: `[1,2,3]`, `[]`, `new() { .. }`
- Always use **var** when type is obvious from right-hand side
- Use regions if you think the file is large and needs formatting
- Prefer pattern matching (`is`, `switch` expressions) over `if-else` chains
- Usings.cs file for common usings and global usings, custom namepaces should be imported in Usings.cs, no usings in individual files
- Interfaces prefixed with "I" and placed next to implementations in the same file

```csharp
//Example for interfaces in Person.cs
//Interface is always on top of the class that implements

public interface IPerson{
}

public class Person : IPerson{

}

```

- Git: A .gitignore file is required in the root directory. Ensure it is correctly configured for .NET (ignoring bin/, obj/, etc.).

## Folder Structure Guidelines

Prefer feature folders over classic layered folders when it makes sense:
Do not create a folder src, just work from the location where Agents.md is located (the root).

Root
├── Models          ← API models (DTOs)
├── DTO              ← Application layer DTOs
├── Repositories              ← Repositories
├── Services                  ← Application services
├── Validators                   ← FluentValidation validators
├── Mappings                   ← AutoMapper profiles
├── http                   ← Contains .htpp files
├── Context                   ← Context for EF Core
└── Program.cs      ← Application entry point


## Dependency Injection & Service Registration

- Use **.NET built-in DI** (IServiceCollection)
- Register services with **scoped** lifetime by default
- Pattern for feature registration:

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserValidator>();
builder.Services.AddAutoMapper(typeof(CreateUserMappingProfile));
builder.Services.AddScoped<IUserRepository, UserEfCoreRepository>(); / / or MongoRepository
```

## Manual endpoint tests

- User .http files for manual endpoint testing
- Place .http ALWAYS files in the http folder
- Use environment variables for base URL and auth tokens
- Organize requests by feature
- Include sample request bodies and expected responses
- Use comments to explain complex requests
  
## Validation

- Always use FluentValidation V12+
- Prefer validator classes over inline validation
- Throw ValidationException (from FluentValidation) when invalid

## Mapping

- Use AutoMapper for all DTO ↔ Entity transformations
- Create profile classes (Profile) per feature
- Prefer ProjectTo for queries when using EF Core
- Never map in controllers/endpoints — do it in services/handlers

## Database Strategy

- We support both EF Core and MongoDB — choose one per project/feature:
- Check the prompt if it's MongoDB or a relational database.
- Check the prompt if it's MongoDB or a relational database.

### EF Core path (most common):

Check the prompt if a database is specified

```csharp
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));
```

### MongoDB path:

```csharp
    services.AddSingleton<IMongoClient>(sp => new MongoClient(connectionString));
services.AddScoped<IMongoDatabase>(sp => sp.GetRequiredService<IMongoClient>().GetDatabase("dbname"));
```

### Repository interface is always the same:

```csharp
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    // ...
}
```

### Testing Guidelines

- Use xunit + FluentAssertions + NSubstitute (or Moq)
- Prefer snapshot testing for API responses (VerifySnapshot / Snapshooter)
- Write unit tests for services & validators
- Write integration tests for endpoints (WebApplicationFactory)
- Always test happy path + main failure cases (validation, not found, etc.)
- Use in-memory database (InMemory or Mongo2Go) for integration tests
- Mock external dependencies (email, payment, etc.)
- Name test methods using the pattern: MethodName_StateUnderTest_ExpectedBehavior
- Organize tests using the Arrange-Act-Assert pattern
- Use [Fact] for simple tests and [Theory] with InlineData for parameterized tests
- Keep tests isolated and independent from each other
- Aim for high code coverage, but prioritize meaningful tests over coverage percentage
- Use test fixtures for shared setup/teardown logic
- Leverage xunit's built-in dependency injection for test classes
  
## Build

dotnet build


## Run (with hot reload)

dotnet watch run --project MyApp.Api

## Run tests

dotnet test

## Format & analyze

dotnet format
dotnet build --no-incremental  # to force full analysis

## What agents SHOULD do

- Add/update tests for every non-trivial change
- Keep endpoints small & focused — move logic to services/handlers
- Use CancellationToken in all async methods that accept it
- Return IResult / TypedResults from minimal APIs
- Prefer Results.Ok(value), Results.NoContent(), Results.Problem(...)
- Use problem details for errors (ValidationProblem, NotFound, etc.)
- Keep methods short (< 30–40 lines is ideal)
- Verify Build: Always run dotnet build to ensure the project compiles successfully before finishing a task or stopping.

## What agents SHOULD NOT do

- Do NOT create controllers (use Minimal APIs)
- Do NOT disable nullable reference types
- Do NOT use .Result / .Wait() — always async/await
- Do NOT commit .csproj changes without necessity
- Do NOT add new NuGet packages without explicit permission
- Do NOT create new folders just for one file — prefer grouping by feature