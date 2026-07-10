import json
import os
from dotenv import load_dotenv
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import Faithfulness, AnswerRelevancy, ContextRecall

from openai import OpenAI
from ragas.llms import llm_factory

import pandas as pd

load_dotenv(dotenv_path="../server/.env")

groq_compat_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",  # ◄ Routes everything to Groq
    api_key=os.environ.get("GROQ_API_KEY")
)

evaluator_llm = llm_factory(
    model="llama-3.3-70b-versatile", 
    client=groq_compat_client
)

with open('../server/src/tests/rag_eval_output.json', 'r') as f:
    raw_data = json.load(f)

formatted_data = {
    "question": [item["question"] for item in raw_data],
    "contexts": [item["contexts"] for item in raw_data], 
    "answer": [item["answer"] for item in raw_data],
    "ground_truth": [item["ground_truth"] for item in raw_data]
}

evaluation_dataset = Dataset.from_dict(formatted_data)

print("Evaluating system performance metrics via OpenAI-to-Groq Bridge...")

scores = evaluate(
    dataset=evaluation_dataset,
    metrics=[
        Faithfulness(llm=evaluator_llm), 
        AnswerRelevancy(llm=evaluator_llm), 
        ContextRecall(llm=evaluator_llm)
    ],
    llm=evaluator_llm
)

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

print("\n--- MULTIMODAL RAG PERFORMANCE SCOREBOARD ---")

df = scores.to_pandas()

print("\n INDIVIDUAL RECORD SCORES (Row-by-Row Breakdown):")
# Select the text and the calculated scores to print
breakdown = df[['user_input','faithfulness', 'answer_relevancy', 'context_recall']]
print(breakdown.to_string(index=True))

print("\n OVERALL SYSTEM AVERAGES:")
# Safely average the columns, ignoring any text or NaN values
final_scores = {
    "faithfulness": df['faithfulness'].mean(),
    "answer_relevancy": df['answer_relevancy'].dropna().mean() if 'answer_relevancy' in df else "Error",
    "context_recall": df['context_recall'].mean()
}
print(json.dumps(final_scores, indent=2))