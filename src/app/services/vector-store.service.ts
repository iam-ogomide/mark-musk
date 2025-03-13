import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';


export interface VectorStoreData {
  ids: string[];
  embeddings: number[][];
  documents: string[];
  metadatas: any[];
  collection_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class VectorStoreService {
 private vectorStoreData: VectorStoreData | null = null;
  private vectorStoreReady = new BehaviorSubject<boolean>(false);
  private readonly MODEL_DIMENSIONS = 384; // dimensions for all-MiniLM-L6-v2

  constructor(private http: HttpClient) {
    this.loadVectorStore();
  }

  private loadVectorStore(): void {
    this.http.get<VectorStoreData>('../../assets/vector_store/creditchek_vector_store.json')
      .pipe(
        tap(data => {
          // Validate the data structure
          if (!this.validateVectorStore(data)) {
            throw new Error('Invalid vector store data structure');
          }
          
          this.vectorStoreData = data;
          this.vectorStoreReady.next(true);
          console.log('Vector store loaded successfully with', 
            data.ids.length, 'documents from collection:', data.collection_name);
        }),
        catchError(error => {
          console.error('Error loading vector store:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  private validateVectorStore(data: any): boolean {
    return Array.isArray(data.ids) && 
           Array.isArray(data.embeddings) && 
           Array.isArray(data.documents) && 
           Array.isArray(data.metadatas) &&
           data.ids.length === data.embeddings.length &&
           data.ids.length === data.documents.length &&
           data.ids.length === data.metadatas.length;
  }

  isReady(): Observable<boolean> {
    return this.vectorStoreReady.asObservable();
  }

  async queryVectorStore(query: string, topK: number = 5): Promise<any[]> {
    if (!this.vectorStoreData) {
      throw new Error('Vector store not loaded');
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate cosine similarity with all embeddings in the store
      const results = this.vectorStoreData.ids.map((id, index) => {
        const docEmbedding = this.vectorStoreData!.embeddings[index];
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
        
        return {
          id,
          document: this.vectorStoreData!.documents[index],
          metadata: this.vectorStoreData!.metadatas[index],
          similarity
        };
      });
      
      // Sort by similarity and take top K results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      console.error('Error querying vector store:', error);
      throw error;
    }
  }

  // In production, consider using a server endpoint for this
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Option 1: Use a server endpoint (recommended for production)
      // return this.http.post<number[]>('/api/generate-embedding', { text }).toPromise();
      
      // Option 2: For demo purposes, use a simplified embedding approach
      // THIS IS NOT EQUIVALENT TO THE PYTHON EMBEDDINGS
      const embedding = new Array(this.MODEL_DIMENSIONS).fill(0);
      
      // Hash the text to create a pseudo-embedding
      const words = text.toLowerCase().split(/\s+/);
      words.forEach((word, wordIndex) => {
        for (let i = 0; i < word.length; i++) {
          const charCode = word.charCodeAt(i);
          const position = (wordIndex * 10 + i) % this.MODEL_DIMENSIONS;
          embedding[position] += charCode / 100;
        }
      });
      
      // Normalize the embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    return dotProduct / (normA * normB) || 0; // Return 0 if division by zero
  }
}
