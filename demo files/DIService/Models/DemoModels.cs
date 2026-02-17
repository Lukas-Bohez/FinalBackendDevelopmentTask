namespace DIService.Models;

public record Comparison(
    string Role,
    string Definition,
    string DirectView, 
    string ServiceView, 
    string IsMatch
);

public record PersonDemoResponse(
    Comparison SingletonMayor,
    Comparison ScopedCustomer,
    Comparison TransientPasserby
);
