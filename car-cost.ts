#!/usr/bin/env bun

import { Database } from 'bun:sqlite';
import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Define types
type CarModel = {
  id?: number;
  brand: string;
  name: string;
  trim: string;
  cost: number;
};

type GraphPoint = [number, number]; // [year, cost]
type Settings = {
  name?: string;
  modelId?: number;
  cost?: number;
  downPayment?: number;
  loanRate?: number;
  loanYears?: number;
  expectedLife?: number;
  insurancePoints?: GraphPoint[];
  yearlyPermitCost?: number;
  maintenancePoints?: GraphPoint[];
};

// Colors for formatting
const colors = {
  red: (text: string) => Bun.color("#ff5555", "ansi") + text + Bun.color("white", "ansi"),
  green: (text: string) => Bun.color("#50fa7b", "ansi") + text + Bun.color("white", "ansi"),
  yellow: (text: string) => Bun.color("#f1fa8c", "ansi") + text + Bun.color("white", "ansi"),
  blue: (text: string) => Bun.color("#8be9fd", "ansi") + text + Bun.color("white", "ansi"),
  magenta: (text: string) => Bun.color("#ff79c6", "ansi") + text + Bun.color("white", "ansi"),
  cyan: (text: string) => Bun.color("#8be9fd", "ansi") + text + Bun.color("white", "ansi"),
  white: (text: string) => Bun.color("#f8f8f2", "ansi") + text + Bun.color("white", "ansi"),
};

// Database setup
const DB_PATH = resolve(import.meta.dir, 'car_costs.db');
const db = new Database(DB_PATH);

// Initialize DB if it doesn't exist
function initializeDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS car_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      trim TEXT NOT NULL,
      cost INTEGER NOT NULL,
      UNIQUE(brand, name, trim)
    )
  `);
}

// Car model operations
function addCarModel(car: CarModel): number {
  const stmt = db.prepare(`
    INSERT INTO car_models (brand, name, trim, cost)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(brand, name, trim) DO UPDATE SET cost = excluded.cost
  `);
  
  const result = stmt.run(car.brand, car.name, car.trim, car.cost);
  return Number(result.lastInsertId);
}

function getCarModel(id: number): CarModel | null {
  return db.query<CarModel>(`SELECT * FROM car_models WHERE id = ?`).get(id) || null;
}

function findCarModels(query: string): CarModel[] {
  const searchTerm = `%${query}%`;
  return db.query<CarModel>(
    `SELECT * FROM car_models WHERE brand LIKE ? OR name LIKE ? OR trim LIKE ?`
  ).all(searchTerm, searchTerm, searchTerm);
}

// Utility functions
function lerp(start: number, end: number, perc: number): number {
  const diff = start - end;
  return start - (diff * perc);
}

function interpolatePoints(points: GraphPoint[], length: number): number[] {
  if (points.length === 0) return Array(length).fill(0);
  if (points.length === 1) return Array(length).fill(points[0][1]);

  // Sort points by year (x-axis)
  points.sort((a, b) => a[0] - b[0]);
  
  const result: number[] = [];
  for (let year = 0; year < length; year++) {
    // Find surrounding points
    let left = points[0];
    let right = points[points.length - 1];
    
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i][0] <= year && points[i+1][0] > year) {
        left = points[i];
        right = points[i+1];
        break;
      }
    }
    
    if (left[0] === right[0]) {
      result.push(left[1]);
    } else {
      const percentage = (year - left[0]) / (right[0] - left[0]);
      result.push(lerp(left[1], right[1], percentage));
    }
  }
  
  return result;
}

function formatCurrency(amount: number): string {
  return colors.green(`$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
}

function calculateLoanPayments(principal: number, rate: number, years: number): number {
  // Monthly payment calculation using the amortization formula
  const monthlyRate = rate / 12;
  const numPayments = years * 12;
  const monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return monthlyPayment * 12 * years; // Total amount paid over the loan term
}

// Main cost calculation function
function calculateCostOfOwnership(settings: Settings): { yearlyBreakdown: number[], total: number } {
  const {
    cost = 0,
    downPayment = 0,
    loanRate = 0.03,
    loanYears = 4,
    expectedLife = 20,
    insurancePoints = [[0, 14000], [expectedLife - 1, 6500]],
    yearlyPermitCost = 2643,
    maintenancePoints = [[0, 1000], [5, 2000], [10, 3500], [15, 5000]]
  } = settings;

  // Calculate loan payments
  const principal = cost - downPayment;
  const totalLoanPayment = calculateLoanPayments(principal, loanRate, loanYears);
  const yearlyLoanPayment = totalLoanPayment / loanYears;
  
  // Interpolate insurance costs over the car's lifetime
  const insuranceCosts = interpolatePoints(insurancePoints, expectedLife);
  
  // Interpolate maintenance costs over the car's lifetime
  const maintenanceCosts = interpolatePoints(maintenancePoints, expectedLife);
  
  // Calculate yearly payments
  const yearlyPayments = Array.from({ length: expectedLife }).map((_, i) => {
    let yearCost = insuranceCosts[i] + yearlyPermitCost + maintenanceCosts[i];
    if (i < loanYears) {
      yearCost += yearlyLoanPayment;
    }
    return yearCost;
  });
  
  const total = yearlyPayments.reduce((acc, v) => acc + v, 0);
  
  return {
    yearlyBreakdown: yearlyPayments,
    total
  };
}

// Command implementations
function commandAdd(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      brand: { type: 'string' },
      name: { type: 'string' },
      trim: { type: 'string' },
      cost: { type: 'string' }
    },
    allowPositionals: true
  });
  
  const brand = parsed.values.brand as string;
  const name = parsed.values.name as string;
  const trim = parsed.values.trim as string;
  const costStr = parsed.values.cost as string;
  
  if (!brand || !name || !trim || !costStr) {
    console.log(colors.red('Error: Missing required parameters'));
    console.log('Usage: car-cost add --brand "Toyota" --name "RAV4" --trim "XLE" --cost 209990');
    process.exit(1);
  }
  
  const cost = parseInt(costStr, 10);
  if (isNaN(cost)) {
    console.log(colors.red('Error: Cost must be a number'));
    process.exit(1);
  }
  
  const id = addCarModel({ brand, name, trim, cost });
  console.log(colors.green(`Car model added with ID: ${id}`));
}

function commandSearch(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      query: { type: 'string' }
    },
    allowPositionals: true
  });
  
  const query = parsed.values.query as string || parsed.positionals[0];
  
  if (!query) {
    console.log(colors.red('Error: Missing search query'));
    console.log('Usage: car-cost search --query "RAV4" or car-cost search "RAV4"');
    process.exit(1);
  }
  
  const models = findCarModels(query);
  
  if (models.length === 0) {
    console.log(colors.yellow('No car models found matching your search.'));
    return;
  }
  
  console.log(colors.cyan(`Found ${models.length} matching car models:`));
  console.log('┌───────┬────────────┬────────────┬────────────┬────────────┐');
  console.log('│   ID  │    Brand   │    Name    │    Trim    │    Cost    │');
  console.log('├───────┼────────────┼────────────┼────────────┼────────────┤');
  
  models.forEach(model => {
    console.log(`│ ${model.id?.toString().padEnd(5)} │ ${model.brand.padEnd(10)} │ ${model.name.padEnd(10)} │ ${model.trim.padEnd(10)} │ ${formatCurrency(model.cost).padEnd(10)}   │`);
  });
  
  console.log('└───────┴────────────┴────────────┴────────────┴────────────┘');
}

function commandSimulate(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      id: { type: 'string' },
      cost: { type: 'string' },
      name: { type: 'string' },
      downPayment: { type: 'string' },
      loanRate: { type: 'string' },
      loanYears: { type: 'string' },
      expectedLife: { type: 'string' },
      permitCost: { type: 'string' },
      insurance: { type: 'string' },
      maintenance: { type: 'string' }
    },
    allowPositionals: true
  });
  
  const settings: Settings = {};
  
  // Try to load from model if ID is provided
  const modelId = parsed.values.id ? parseInt(parsed.values.id as string, 10) : undefined;
  if (modelId) {
    const model = getCarModel(modelId);
    if (!model) {
      console.log(colors.red(`Error: No car model found with ID ${modelId}`));
      process.exit(1);
    }
    
    settings.modelId = modelId;
    settings.name = `${model.brand} ${model.name} ${model.trim}`;
    settings.cost = model.cost;
  } else if (parsed.values.cost) {
    // Use provided cost if no model ID
    settings.cost = parseInt(parsed.values.cost as string, 10);
    settings.name = parsed.values.name as string || "Custom Car";
  } else {
    console.log(colors.red('Error: Either a model ID or cost must be provided'));
    console.log('Usage: car-cost simulate --id 1 or car-cost simulate --cost 209990 --name "Toyota RAV4"');
    process.exit(1);
  }
  
  // Parse optional parameters
  if (parsed.values.downPayment) {
    settings.downPayment = parseInt(parsed.values.downPayment as string, 10);
  }
  
  if (parsed.values.loanRate) {
    settings.loanRate = parseFloat(parsed.values.loanRate as string);
  }
  
  if (parsed.values.loanYears) {
    settings.loanYears = parseInt(parsed.values.loanYears as string, 10);
  }
  
  if (parsed.values.expectedLife) {
    settings.expectedLife = parseInt(parsed.values.expectedLife as string, 10);
  }
  
  if (parsed.values.permitCost) {
    settings.yearlyPermitCost = parseInt(parsed.values.permitCost as string, 10);
  }
  
  // Parse insurance and maintenance points
  if (parsed.values.insurance) {
    try {
      settings.insurancePoints = JSON.parse(parsed.values.insurance as string) as GraphPoint[];
    } catch (e) {
      console.log(colors.red('Error: Insurance points must be a valid JSON array of [year, cost] pairs'));
      console.log('Example: --insurance "[[0, 14000], [5, 11000], [15, 6500]]"');
      process.exit(1);
    }
  }
  
  if (parsed.values.maintenance) {
    try {
      settings.maintenancePoints = JSON.parse(parsed.values.maintenance as string) as GraphPoint[];
    } catch (e) {
      console.log(colors.red('Error: Maintenance points must be a valid JSON array of [year, cost] pairs'));
      console.log('Example: --maintenance "[[0, 1000], [5, 2000], [10, 3500], [15, 5000]]"');
      process.exit(1);
    }
  }
  
  // Calculate and display results
  const { yearlyBreakdown, total } = calculateCostOfOwnership(settings);
  const avgYear = total / yearlyBreakdown.length;
  
  console.log(colors.cyan('═════════════════════════════════════════════════════════'));
  console.log(colors.cyan(`Car Cost of Ownership: ${settings.name}`));
  console.log(colors.cyan('═════════════════════════════════════════════════════════'));
  console.log(`${colors.white('Purchase price:')} ${formatCurrency(settings.cost || 0)}`);
  console.log(`${colors.white('Down payment:')} ${formatCurrency(settings.downPayment || 0)}`);
  console.log(`${colors.white('Loan rate:')} ${colors.yellow((settings.loanRate || 0.03) * 100 + '%')}`);
  console.log(`${colors.white('Loan term:')} ${colors.yellow(settings.loanYears || 4)} years`);
  console.log(`${colors.white('Expected lifetime:')} ${colors.yellow(settings.expectedLife || 20)} years`);
  console.log(colors.cyan('─────────────────────────────────────────────────────────'));
  
  console.log(colors.magenta('Yearly Breakdown:'));
  yearlyBreakdown.forEach((cost, i) => {
    const monthlyPayment = cost / 12;
    console.log(`${colors.white(`Year ${i+1}:`)} ${formatCurrency(cost)} (Monthly: ${formatCurrency(monthlyPayment)})`);
  });
  
  console.log(colors.cyan('─────────────────────────────────────────────────────────'));
  console.log(`${colors.white('Average yearly cost:')} ${formatCurrency(avgYear)} (Monthly: ${formatCurrency(avgYear/12)})`);
  console.log(`${colors.white('Total lifetime cost:')} ${colors.red(formatCurrency(total))}`);
  console.log(colors.cyan('═════════════════════════════════════════════════════════'));
}

function commandHelp() {
  console.log(colors.cyan('Car Cost of Ownership Calculator'));
  console.log(colors.cyan('═════════════════════════════════════════════════════════'));
  console.log(colors.yellow('Usage:'));
  console.log('  car-cost <command> [options]');
  console.log('');
  console.log(colors.yellow('Commands:'));
  console.log('  add         Add a new car model to the database');
  console.log('  search      Search for car models in the database');
  console.log('  simulate    Calculate cost of ownership');
  console.log('  help        Show this help message');
  console.log('');
  console.log(colors.yellow('Examples:'));
  console.log('  car-cost add --brand "Toyota" --name "RAV4" --trim "XLE" --cost 209990');
  console.log('  car-cost search "RAV4"');
  console.log('  car-cost simulate --id 1 --downPayment 50000 --expectedLife 15');
  console.log('  car-cost simulate --cost 209990 --name "Toyota RAV4" --downPayment 50000');
  console.log('');
  console.log(colors.yellow('Simulation Options:'));
  console.log('  --id <id>                 Use a car model from the database');
  console.log('  --cost <amount>           Car purchase price (if not using --id)');
  console.log('  --name <name>             Car name (if not using --id)');
  console.log('  --downPayment <amount>    Down payment amount (default: 0)');
  console.log('  --loanRate <rate>         Loan interest rate as decimal (default: 0.03)');
  console.log('  --loanYears <years>       Loan term in years (default: 4)');
  console.log('  --expectedLife <years>    Expected lifetime of the car (default: 20)');
  console.log('  --permitCost <amount>     Yearly permit/registration cost (default: 2643)');
  console.log('  --insurance <points>      JSON array of [year, cost] points');
  console.log('  --maintenance <points>    JSON array of [year, cost] points');
}

// Main CLI handler
async function main() {
  initializeDb();
  
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  switch (command) {
    case 'add':
      commandAdd(args.slice(1));
      break;
    case 'search':
      commandSearch(args.slice(1));
      break;
    case 'simulate':
      commandSimulate(args.slice(1));
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      commandHelp();
      break;
  }
}

// Start the application
main().catch(err => {
  console.error(colors.red('Error:'), err.message);
  process.exit(1);
});
