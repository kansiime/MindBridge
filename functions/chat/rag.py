"""
RAG pipeline using pgvector directly via psycopg2.
"""
import os

import anthropic
import psycopg2
import psycopg2.extras
from django.conf import settings


def get_embedding(text: str) -> list:
    """Get embedding using Anthropic Voyage model."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.post(
        '/v1/embeddings',
        body={'model': 'voyage-3', 'input': text},
    )
    return response.get('embeddings', [[]])[0]


def get_connection():
    return psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'mindbridge'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
    )


def search_knowledge(query: str, module_id: str = None, k: int = 5) -> list:
    """Semantic search over knowledge_chunks using pgvector."""
    try:
        embedding = get_embedding(query)
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if module_id:
            cur.execute(
                """
                SELECT id, content, source, topic, chunk_type,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM knowledge_chunks
                WHERE module_id = %s
                  AND 1 - (embedding <=> %s::vector) > 0.7
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                [str(embedding), module_id, str(embedding), str(embedding), k],
            )
        else:
            cur.execute(
                """
                SELECT id, content, source, topic, chunk_type,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM knowledge_chunks
                WHERE 1 - (embedding <=> %s::vector) > 0.7
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                [str(embedding), str(embedding), str(embedding), k],
            )

        results = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in results]
    except Exception as e:
        print(f'[RAG search error] {e}')
        return []


def ingest_knowledge(chunks: list) -> dict:
    """Ingest knowledge chunks with embeddings into PostgreSQL."""
    conn = get_connection()
    cur = conn.cursor()
    count = 0

    for chunk in chunks:
        try:
            embedding = get_embedding(chunk['content'])
            cur.execute(
                """
                INSERT INTO knowledge_chunks
                    (id, content, embedding, module_id, source, topic, chunk_type)
                VALUES (gen_random_uuid(), %s, %s::vector, %s, %s, %s, %s)
                """,
                [
                    chunk['content'],
                    str(embedding),
                    chunk.get('module_id'),
                    chunk.get('source'),
                    chunk.get('topic'),
                    chunk.get('chunk_type', 'technique'),
                ],
            )
            count += 1
        except Exception as e:
            print(f'[RAG ingest error] {e}')
            continue

    conn.commit()
    cur.close()
    conn.close()
    return {'ingested': count}
