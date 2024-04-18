const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

console.log(__dirname);

// Path to the JSON file that will store our poll results
const DATA_FILE = path.join(__dirname, "pollResults.json");

const BANNED_WORDS_FILE = path.join(__dirname, "banned-words.txt");

const loadBannedWords = () => {
	const fileContents = fs.readFileSync(BANNED_WORDS_FILE, "utf8");
	return new Set(fileContents.split("\n"));
};

const bannedWords = loadBannedWords();

// Initialize the poll results file if it doesn't exist
const initializeData = () => {
	if (!fs.existsSync(DATA_FILE)) {
		console.log('creating new file');
		fs.writeFileSync(DATA_FILE, JSON.stringify({}));
	}
};

// Helper function to read data from the JSON file
const readData = () => {
	delete require.cache[require.resolve(DATA_FILE)]; // Invalidate the require cache to ensure fresh data
	return require(DATA_FILE);
};

// Helper function to write data to the JSON file
const writeData = (data) => {
	const filteredData = Object.keys(data).reduce((acc, key) => {
		if (!bannedWords.has(key)) {
			acc[key] = data[key];
		} else {
			console.log(`Banned word detected: ${key}`);
		}
		return acc;
	}, {});
	fs.writeFileSync(DATA_FILE, JSON.stringify(filteredData, null, 2));
};

initializeData(); // Ensure the data file is ready on start

app.post("/submit", (req, res) => {
	const { response } = req.body;
	if (typeof response === "string" && response.length > 0) {
		const words = response.toLowerCase().match(/\w+/g);
		const data = readData();
		words.forEach((word) => {
			if (!bannedWords.has(word)) {
				if (!data[word]) {
					data[word] = 0;
				}
				data[word] += 1;
			}
		});
		writeData(data);
		res.json({
			status: "success",
			message: "Response added to the word cloud.",
		});
	} else {
		res.status(400).json({ status: "error", message: "Invalid response." });
	}
});

app.get("/results", (req, res) => {
	const data = readData();
	const wordCloud = Object.keys(data).map((word) => ({
		text: word,
		value: data[word],
	}));
	res.json(wordCloud);
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});