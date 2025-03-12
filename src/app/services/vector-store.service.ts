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

  constructor() { }
}
