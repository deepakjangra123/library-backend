import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from 'xlsx';

const app = express();
const PORT = process.env.PORT || 8080;

// Get correct file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "public", "data.json");
const DATA_FILE2 = path.join(__dirname, "public", "data2.json");

app.use(express.json({ limit: "10mb" })); // Allows up to 10MB payload
app.use(cors({
  origin: "*", // Allows all origins
  methods: "GET,POST",
  allowedHeaders: "Content-Type"
}));



// Fetch data from JSON file
app.get("/api/data", async (req, res) => {
  try {
    const data = await fs.promises.readFile(DATA_FILE, "utf8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading data file:", error);
    res.status(500).json({ error: "Failed to read data file" });
  }
});

app.get("/api/download", async (req, res) => {
  try {
    const data1 = JSON.parse(await fs.promises.readFile(DATA_FILE, "utf8"));
    const data2 = JSON.parse(await fs.promises.readFile(DATA_FILE2, "utf8"));

    // Merge the data
    const mergedJSON = data1.map((item, index) => ({
      ...item,
      ...data2[index],
    }));

    // Reorder columns function
    const reorderColumns = (data, columnOrder) => {
      return data.map(item => {
        const reorderedItem = {};
        columnOrder.forEach(col => {
          reorderedItem[col] = item[col] || ""; // Ensure all keys exist
        });
        return reorderedItem;
      });
    };

    // Define column order
    const columnOrder = [
      'ACCESSION', 'DATE ', 'NAME', 'TITLE', 'EDITION ',
      'VOLUME', 'PUBLISHER & PUBLICATION PLACE ', 'YEAR ', 'PAGES ', 'VOLUME ',
      'SOURCE ', 'COST ', 'DEPT', 'REMARK', 'CHALLAN NO.', 'CHALLAN DATE ',
      'PLACE'
    ];

    // Define column widths
    const columnWidths = [7, 17.28515625, 37, 45.28515625, 7.28, 7.28515625, 33.85546875, 9, 9, 9, 18.140625, 9, 14, 22, 13, 17.140625, 15];

    // Reorder data
    const reorderedData = reorderColumns(mergedJSON, columnOrder);

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(reorderedData);
    ws['!rows'] = Array(reorderedData.length).fill({ hpx: 28.8 });
    ws['!cols'] = columnWidths.map(width => ({ wch: width }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Write workbook to a buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers for file download
    res.setHeader("Content-Disposition", "attachment; filename=output.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Send buffer as response
    res.send(buffer);
  } catch (error) {
    console.error("Error generating file:", error);
    res.status(500).json({ error: "Failed to generate file" });
  }
});


app.post("/api/save", async (req, res) => {
  try {
    let existingData = [];
    
    // Read existing file data
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = await fs.promises.readFile(DATA_FILE, "utf8");
      existingData = JSON.parse(fileContent);
    }

    const newData = req.body;
    
    // Write new data to file
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(newData, null, 2));

    res.json({ success: true, message: "Data saved successfully!" });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: "Failed to save data" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
