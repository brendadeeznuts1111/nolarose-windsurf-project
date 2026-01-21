# Bun.inspect.table() VS Code Snippets

## 🚀 Installation

The snippets are automatically available in VS Code when you open this project. They provide quick access to powerful Bun table formatting functionality.

## 📋 Available Snippets

### 🏷️ Basic Snippets

#### `bun-table` or `bun-inspect-table`
**Basic Bun.inspect.table()**
```javascript
console.log(
  Bun.inspect.table([
    { name: 'Alice', age: 30, city: 'New York' },
    { name: 'Bob', age: 25, city: 'San Francisco' },
    { name: 'Charlie', age: 35, city: 'Chicago' }
  ])
)
```

### 🛡️ Fraud Detection Snippets

#### `bun-fraud-table` or `bun-security-table`
**Fraud Detection Table**
```javascript
console.log(
  Bun.inspect.table(
    transactions.map(t => ({
      transactionId: t.id,
      amount: t.amount,
      riskScore: t.riskScore.toFixed(3),
      riskLevel: t.riskLevel,
      status: t.blocked ? '🚫 BLOCKED' : '✅ APPROVED',
      timestamp: new Date(t.timestamp).toLocaleString()
    })),
    { maxWidth: 120 }
  )
)
```

### 📊 Performance Snippets

#### `bun-metrics-table` or `bun-performance-table`
**Performance Metrics Table**
```javascript
console.log(
  Bun.inspect.table([
    { metric: 'Accuracy', value: 95.3, unit: '%', status: '🟢 Excellent' },
    { metric: 'Latency', value: 150, unit: 'ms', status: '🟢 Good' },
    { metric: 'Throughput', value: 145, unit: 'eps', status: '🟢 Optimal' },
    { metric: 'False Positives', value: 1.8, unit: '%', status: '🟡 Low' }
  ], { maxWidth: 100 })
)
```

### 🎛️ Advanced Snippets

#### `bun-custom-table` or `bun-columns-table`
**Custom Column Selection**
```javascript
console.log(
  Bun.inspect.table(
    data.map(item => ({
      id: item.id,
      name: item.name,
      value: item.value,
      status: item.status,
      timestamp: item.timestamp,
      // Hidden columns available but not displayed
      hidden: item.hiddenData,
      metadata: item.metadata,
    })),
    { 
      maxWidth: 200, 
      columns: ['id', 'name', 'value', 'status', 'timestamp']
    }
  )
)
```

#### `bun-math-table` or `bun-number-table`
**Mathematical Properties Table**
```javascript
console.log(
  Bun.inspect.table(
    Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      return {
        n,
        sq: n ** 2,
        cube: n ** 3,
        sqrt: Math.sqrt(n).toFixed(3),
        isEven: n % 2 === 0,
        isPrime: ((x) => {
          if (x < 2) return false;
          for (let j = 2; j <= Math.sqrt(x); j++) if (x % j === 0) return false;
          return true;
        })(n)
      };
    }),
    { maxWidth: 150 }
  )
)
```

### 🔒 Security Snippets

#### `bun-security-table` or `bun-threat-table`
**Security Analysis Table**
```javascript
console.log(
  Bun.inspect.table(
    securityEvents.map(event => ({
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      riskScore: event.riskScore.toFixed(3),
      source: event.sourceIP,
      blocked: event.blocked ? '🚫' : '⚠️',
      action: event.recommendedAction,
      timestamp: new Date(event.timestamp).toLocaleString()
    })),
    { maxWidth: 180, columns: [
      'eventId', 'type', 'severity', 'riskScore', 'source', 'blocked', 'action'
    ] }
  )
)
```

### ⚡ Real-time Snippets

#### `bun-realtime-table` or `bun-stream-table`
**Real-time Monitoring Table**
```javascript
const displayRealTimeData = (data) => {
  console.clear();
  console.log('🔄 Real-time Fraud Detection Monitor');
  console.log('='.repeat(50));
  console.log('');
  
  console.log(
    Bun.inspect.table(
      data.map(item => ({
        id: item.id,
        score: item.riskScore.toFixed(3),
        level: item.riskLevel,
        status: item.blocked ? '🚫' : '✅',
        time: new Date(item.timestamp).toLocaleTimeString()
      })),
      { maxWidth: 100 }
    )
  );
  console.log('');
  console.log(`Last updated: ${new Date().toLocaleString()}`);
};

// Usage: displayRealTimeData(realTimeData);
```

### 📈 Report Snippets

#### `bun-report-table` or `bun-comprehensive-table`
**Complete Fraud Detection Report**
```javascript
console.log('📊 Enhanced Fraud Detection Report');
console.log('='.repeat(60));
console.log('');

// Summary Table
console.log('📈 Summary Metrics:');
console.log(
  Bun.inspect.table([
    { metric: 'Total Transactions', value: report.total, trend: '📈' },
    { metric: 'Blocked Transactions', value: report.blocked, trend: '📊' },
    { metric: 'Detection Rate', value: report.detectionRate + '%', trend: '🎯' },
    { metric: 'False Positive Rate', value: report.falsePositiveRate + '%', trend: '📉' }
  ])
);
console.log('');

// Risk Distribution
console.log('🎯 Risk Distribution:');
console.log(
  Bun.inspect.table(
    Object.entries(report.riskDistribution).map(([level, count]) => ({
      level: level.toUpperCase(),
      count,
      percentage: ((count / report.total) * 100).toFixed(1) + '%'
    }))
  )
);
console.log('');

// High Risk Transactions
console.log('🚨 High Risk Transactions:');
console.log(
  Bun.inspect.table(
    report.highRiskTransactions.slice(0, 5).map(tx => ({
      id: tx.id,
      amount: '$' + tx.amount.toLocaleString(),
      score: tx.riskScore.toFixed(3),
      factors: tx.riskFactors.join(', '),
      action: tx.recommendedAction
    })),
    { maxWidth: 120 }
  )
);
```

## 🎯 Usage Tips

### 1. **Quick Access**
- Type any prefix (e.g., `bun-table`) in a JavaScript/TypeScript file
- Select the desired snippet from the IntelliSense menu
- Press Tab or Enter to insert

### 2. **Customization**
- Modify the data structure to match your needs
- Adjust `maxWidth` for different terminal sizes
- Customize column selection with the `columns` option

### 3. **Integration**
- Use in CLI applications for professional output
- Integrate with fraud detection systems
- Perfect for monitoring and reporting tools

### 4. **Best Practices**
- Keep column names concise for better formatting
- Use consistent data types within columns
- Format numbers with appropriate precision
- Add status indicators with emojis for visual clarity

## 🔧 Configuration Options

### maxWidth
Controls the maximum width of the table:
```javascript
{ maxWidth: 120 }  // Limit to 120 characters
```

### columns
Select specific columns to display:
```javascript
{ columns: ['id', 'name', 'status', 'timestamp'] }
```

## 🚀 Advanced Features

- **Mixed Data Types**: Numbers, strings, booleans, objects
- **Auto-sizing**: Columns adjust to content width
- **Unicode Support**: Emojis and special characters
- **Responsive**: Adapts to terminal constraints
- **Performance**: Fast rendering of large datasets

## 📚 Related Documentation

- [Bun Documentation](https://bun.sh/docs)
- [Enhanced Fraud Detection System](../README.md)
- [CLI Tools](../cli/risk-hunter.ts)
- [API Reference](../docs/API.md)

---

**🎯 These snippets will supercharge your CLI development with professional table formatting!**
