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

### Adding a Car to the Database

```bash
./car-cost add --brand "Toyota" --name "RAV4" --trim "XLE" --cost 209990
```

### Searching for Cars

```bash
./car-cost search "RAV4"
```

### Calculating Cost of Ownership

Using a car from the database:

```bash
./car-cost simulate --id 1 --downPayment 50000 --loanRate 0.03 --expectedLife 15
```

Using custom parameters:

```bash
./car-cost simulate --cost 209990 --name "Toyota RAV4" \
  --downPayment 50000 \
  --insurance "[[0, 14000], [5, 11000], [15, 6500]]" \
  --maintenance "[[0, 1000], [5, 2000], [10, 3500], [15, 5000]]"
```

### Help

```bash
./car-cost help
```

## Advanced Options

The simulation command supports several customization options:

| Option           | Description                            | Default                                        |
| ---------------- | -------------------------------------- | ---------------------------------------------- |
| `--id`           | Use a car model from the database      | -                                              |
| `--cost`         | Car purchase price (if not using --id) | -                                              |
| `--name`         | Car name (if not using --id)           | "Custom Car"                                   |
| `--downPayment`  | Down payment amount                    | 0                                              |
| `--loanRate`     | Loan interest rate as decimal          | 0.03 (3%)                                      |
| `--loanYears`    | Loan term in years                     | 4                                              |
| `--expectedLife` | Expected lifetime of the car           | 20                                             |
| `--permitCost`   | Yearly permit/registration cost        | 2643                                           |
| `--insurance`    | JSON array of [year, cost] points      | [[0, 14000], [last, 6500]]                     |
| `--maintenance`  | JSON array of [year, cost] points      | [[0, 1000], [5, 2000], [10, 3500], [15, 5000]] |

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0.0+)

## License

MIT
