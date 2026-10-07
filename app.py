from flask import Flask, render_template, request, jsonify
import nltk
import re
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

app = Flask(__name__)


# =========================
# LOAD QUESTIONS & ANSWERS
# =========================

data = {}

with open("questions_answers.txt", "r", encoding="utf-8") as file:
    for line in file:
        line = line.strip()

        if not line:
            continue

        question, answer = line.split("|", 1)

        question = question.lower().strip()

        data[question] = answer


# =========================
# NLTK TOOLS
# =========================

stop_words = set(stopwords.words("english"))
stemmer = PorterStemmer()


# =========================
# TEXT NORMALIZATION
# =========================

def normalize_text(text):

    text = text.lower().strip()

    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    return text


# =========================
# PROCESS TEXT
# =========================

def process_text(text):

    text = normalize_text(text)

    tokens = nltk.word_tokenize(text)

    words = []

    for word in tokens:

        if word.isalnum() and word not in stop_words:

            words.append(stemmer.stem(word))

    return words


# =========================
# PREPROCESS DATABASE
# =========================

processed_data = {}

for question, answer in data.items():

    tokens = process_text(question)

    processed_data[question] = {
        "tokens": tokens,
        "answer": answer
    }


# =========================
# CHATBOT RESPONSE
# =========================

def get_bot_response(user_question):

    clean_question = normalize_text(user_question)

    # --------------------------------
    # 1. EXACT MATCH
    # --------------------------------

    if clean_question in data:

        return data[clean_question]


    # --------------------------------
    # 2. VERY SIMILAR QUESTION MATCH
    # --------------------------------

    user_tokens = process_text(user_question)

    if not user_tokens:

        return "Please enter a valid question."


    best_match = None
    best_score = 0


    for question, question_data in processed_data.items():

        stored_tokens = question_data["tokens"]

        if not stored_tokens:
            continue


        user_set = set(user_tokens)
        stored_set = set(stored_tokens)

        common_words = user_set.intersection(stored_set)


        if not common_words:
            continue


        # User question lo entha portion match ayyindo
        user_match = len(common_words) / len(user_set)

        # Stored question lo entha portion match ayyindo
        question_match = len(common_words) / len(stored_set)


        # Both scores combine
        score = (user_match * 0.6) + (question_match * 0.4)


        if score > best_score:

            best_score = score
            best_match = question


    # --------------------------------
    # 3. RETURN ONLY GOOD MATCH
    # --------------------------------

    if best_match and best_score >= 0.65:

        return processed_data[best_match]["answer"]


    # --------------------------------
    # 4. FALLBACK
    # --------------------------------

    return (
        "I don't have that information in my knowledge base yet. "
        "Please try another question about the internship, "
        "projects, classes, certificates, documentation, "
        "submission, placement or support."
    )


# =========================
# HOME PAGE
# =========================

@app.route("/")
def home():

    return render_template("index.html")


# =========================
# CHAT API
# =========================

@app.route("/chat", methods=["POST"])
def chat():

    user_message = request.json.get("message", "")


    if not user_message.strip():

        return jsonify({
            "response": "Please enter a question."
        })


    # Exit
    if normalize_text(user_message) == "exit":

        response = (
            "Thank you for using Student Query Assistant! "
            "Have a great day!"
        )

    else:

        response = get_bot_response(user_message)


    return jsonify({
        "response": response
    })


# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":

    app.run(debug=True)