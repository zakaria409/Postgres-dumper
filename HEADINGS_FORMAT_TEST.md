# Test Markdown Headings Format

Use this example to test the headings format toggle:

## Example 1: Person Data

```markdown
# Name
John Doe

# Age
30

# Email
john@example.com

# Name
Jane Smith

# Age
25

# Email
jane@example.com
```

### Expected Behavior:

**Single Column Mode:**
- 1 column: "Name"
- 3 rows with content from each heading section

**Multi Column Mode:**
- 3 columns: "Name", "Age", "Email"
- 1 row with all the content combined

## Example 2: Product Information

```markdown
# Product Name
Laptop

# Price
1299.99

# Category
Electronics

# Stock
45

# Product Name
Mouse

# Price
29.99

# Category
Accessories

# Stock
120
```

### Expected Behavior:

**Single Column Mode:**
- 1 column: "Product Name"
- 4 rows

**Multi Column Mode:**
- 4 columns: "Product Name", "Price", "Category", "Stock"
- 1 row

## How to Test:

1. Start the application
2. Paste one of the examples above into the input area
3. Click Parse/Continue
4. In the Preview stage, you should see a toggle button appear (only for headings format)
5. Click between "Single Column" and "Multi Column" to see the table update
6. Verify the row/column counts update correctly
7. Continue to Mapping and verify the correct headers are passed
