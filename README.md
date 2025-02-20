# Car Cost of Ownership Calculator

A comprehensive CLI tool for calculating the true cost of car ownership over time. This tool helps you make informed financial decisions by analyzing the total expenses associated with buying and maintaining a vehicle.

## Features

- **Car Database:** Store and search multiple vehicle models with their base prices
- **Complete Cost Analysis:** Calculate full ownership costs including:
  - Purchase price and financing
  - Insurance costs that change over time
  - Registration and permit costs
  - Maintenance expenses that increase with vehicle age
- **Flexible Financing Models:** Configure down payment, loan term, and interest rates
- **Visual Output:** Colorful console output with yearly and monthly breakdowns

## Installation

```bash
# Clone the repository
git clone https://github.com/ArielBenichou/carcost.git
cd carcost

# Make sure Bun is installed (https://bun.sh)

# Make the script executable
chmod +x car-cost car-cost.ts
```

## Usage

```
Car Cost of Ownership Calculator
═════════════════════════════════════════════════════════
Usage:
  car-cost <command> [options]

Commands:
  add         Add a new car model to the database
  search      Search for car models in the database
  simulate    Calculate cost of ownership
  help        Show this help message

Examples:
  car-cost add --brand "Toyota" --name "RAV4" --trim "XLE" --cost 209990 --permitCost 2500
  car-cost add --brand "Tesla" --name "Model 3" --trim "LR" --cost 489990 --permitCost 3000 \
           --insurance "[[0,18000],[5,14000],[10,10000]]" \
           --maintenance "[[0,500],[5,1500],[10,3000],[15,4500]]"
  car-cost search "RAV4" --verbose
  car-cost simulate --id 1 --downPayment 50000 --expectedLife 15

Add Car Options:
  --brand <brand>            Car manufacturer (required)
  --name <name>              Car model name (required)
  --trim <trim>              Car trim/variant (required)
  --cost <amount>            Car purchase price (required)
  --permitCost <amount>      Yearly permit/registration cost
  --insurance <points>       JSON array of [year, cost] points for insurance
  --maintenance <points>     JSON array of [year, cost] points for maintenance

Search Options:
  --query <text>             Search term for car models
  --verbose                  Show detailed information including costs

Simulation Options:
  --id <id>                  Use a car model from the database (includes model-specific costs)
  --cost <amount>            Car purchase price (if not using --id)
  --name <name>              Car name (if not using --id)
  --downPayment <amount>     Down payment amount (default: 0)
  --loanRate <rate>          Loan interest rate as decimal (default: 0.03)
  --loanYears <years>        Loan term in years (default: 4)
  --expectedLife <years>     Expected lifetime of the car (default: 20)
  --permitCost <amount>      Yearly permit/registration cost (overrides model data)
  --insurance <points>       JSON array of [year, cost] points (overrides model data)
  --maintenance <points>     JSON array of [year, cost] points (overrides model data)
```

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0.0+)

## License

MIT
