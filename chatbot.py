import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer


print("======================================")
print(" Welcome to TopGrade Internship Assistant!")
print("======================================")
print("Ask me about:")
print("Internship | Classes | Domains | Projects")
print("Documentation | Submission | Placement")
print("Type 'exit' to stop the chatbot.\n")


# Open questions and answers file
file = open("questions_answers.txt", "r")

data = {}

for line in file:
    line = line.strip()

    if not line:
        continue

    question, answer = line.split("|", 1)
    data[question.lower()] = answer

file.close()


# NLTK tools
stop_words = set(stopwords.words("english"))
stemmer = PorterStemmer()


# Function to process text
def process_text(text):

    tokens = nltk.word_tokenize(text.lower())

    filtered_words = []

    for word in tokens:
        if word.isalnum() and word not in stop_words:
            stemmed_word = stemmer.stem(word)
            filtered_words.append(stemmed_word)

    return filtered_words


# Process all questions from file
processed_data = {}

for question, answer in data.items():

    processed_question = process_text(question)

    processed_data[question] = {
        "tokens": processed_question,
        "answer": answer
    }


# Chatbot loop
while True:

    user_question = input("Ask your question: ")

    # Exit option
    if user_question.lower() == "exit":
        print("Bot: Thank you for using TopGrade Internship Assistant!")
        print("Have a great day!")
        break


    # Convert user question to lowercase
    clean_question = user_question.lower().strip()


    # First check for exact match
    if clean_question in data:
        print("Bot:", data[clean_question])
        continue


    # Process user question using NLTK
    user_tokens = process_text(user_question)


    best_match = None
    highest_score = 0


    # Compare user question with stored questions
    for question in processed_data:

        stored_tokens = processed_data[question]["tokens"]

        score = 0

        for word in user_tokens:
            if word in stored_tokens:
                score += 1


        # Calculate match percentage
        if user_tokens:
            match_percentage = score / len(user_tokens)
        else:
            match_percentage = 0


        # Find best matching question
        if match_percentage > highest_score:
            highest_score = match_percentage
            best_match = question


    # Display answer
    if best_match and highest_score >= 0.5:
        print("Bot:", processed_data[best_match]["answer"])
    else:
        print("Bot: Sorry, I don't understand your question.")
        print("Please ask about internship, projects, domains, or submission.")