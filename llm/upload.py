import os
import uuid
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client
from dotenv import load_dotenv
from llm_manager import llm_manager

load_dotenv()

def uploadUcf():
    # -------------------------------------------------
    # Configuration and setup of all the supabase variables
    # -------------------------------------------------
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --------------------------------------------
    # import the text
    # --------------------------------------------
    txtName = input("Enter the name of the txt file: ")
    loader = TextLoader(txtName)
    documents = loader.load()


    # -------------------------------------------------
    # Spliting the text into chunks 
    # -------------------------------------------------
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    docs = text_splitter.split_documents(documents)


    # -------------------------------------------------
    # Embedding model configuration (now uses configurable embeddings)
    # -------------------------------------------------
    embeddings = llm_manager.get_embeddings()
    print(f"Using embeddings for UCF: {type(embeddings).__name__}")

    # -------------------------------------------------
    # vectorstore connection with custom IDs
    # -------------------------------------------------
    try:
        # Generate sequential integer IDs instead of UUIDs
        texts = [doc.page_content for doc in docs]
        metadatas = [doc.metadata for doc in docs]
        
        # Create the vectorstore first
        vectorstore = SupabaseVectorStore(
            client=supabase,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents"
        )
        
        # Add texts with sequential integer IDs
        start_id = 1
        existing_count = 0
        try:
            # Try to get the highest existing ID
            result = supabase.table("documents").select("id").order("id", desc=True).limit(1).execute()
            if result.data and len(result.data) > 0:
                existing_count = result.data[0]["id"]
        except Exception as e:
            print(f"Warning: Could not get existing count, starting from 1: {e}")
        
        start_id = existing_count + 1
        ids = [str(start_id + i) for i in range(len(texts))]
        
        # Add the vectors with proper integer IDs
        vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        
    except Exception as e:
        print(f"Error during upload: {e}")
        print("Trying alternative approach...")
        
        # Alternative: let Supabase auto-generate IDs
        vectorstore = SupabaseVectorStore.from_documents(
            docs,
            embeddings,
            client=supabase,
            table_name="documents",
            query_name="match_documents",
            ids=None  # Let Supabase handle ID generation
        )

    print("Done! Your text chunks are now embedded and saved to Supabase.")


def upload_verilog():
    # -------------------------------------------------
    # Configuration and setup of all the supabase variables
    # -------------------------------------------------
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --------------------------------------------
    # import the text
    # --------------------------------------------
    txtName = input("Enter the name of the txt file: ")
    loader = TextLoader(txtName)
    documents = loader.load()


    # -------------------------------------------------
    # Spliting the text into chunks 
    # -------------------------------------------------
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    docs = text_splitter.split_documents(documents)


    # -------------------------------------------------
    # Embedding model configuration (now uses configurable embeddings)
    # -------------------------------------------------
    embeddings = llm_manager.get_embeddings()
    print(f"Using embeddings for Verilog: {type(embeddings).__name__}")

    # -------------------------------------------------
    # vectorstore connection with custom IDs
    # -------------------------------------------------
    try:
        # Generate sequential integer IDs instead of UUIDs
        texts = [doc.page_content for doc in docs]
        metadatas = [doc.metadata for doc in docs]
        
        # Create the vectorstore first
        vectorstore = SupabaseVectorStore(
            client=supabase,
            embedding=embeddings,
            table_name="documents_verilog",
            query_name="match_documents_verilog"
        )
        
        # Add texts with sequential integer IDs
        start_id = 1
        existing_count = 0
        try:
            # Try to get the highest existing ID
            result = supabase.table("documents_verilog").select("id").order("id", desc=True).limit(1).execute()
            if result.data and len(result.data) > 0:
                existing_count = result.data[0]["id"]
        except Exception as e:
            print(f"Warning: Could not get existing count, starting from 1: {e}")
        
        start_id = existing_count + 1
        ids = [str(start_id + i) for i in range(len(texts))]
        
        # Add the vectors with proper integer IDs
        vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        
    except Exception as e:
        print(f"Error during upload: {e}")
        print("Trying alternative approach...")
        
        # Alternative: let Supabase auto-generate IDs
        vectorstore = SupabaseVectorStore.from_documents(
            docs,
            embeddings,
            client=supabase,
            table_name="documents_verilog",
            query_name="match_documents_verilog",
            ids=None  # Let Supabase handle ID generation
        )

    print("Done! Your text chunks are now embedded and saved to Supabase.")

def main():
    while(True):
        print("-------------------------------------------------------------------")
        print("This is the upload script for the UCF and Verilog text files")
        print("-------------------------------------------------------------------")
        print("Select one of the following options:")
        print("1. Upload UCF text file")
        print("2. Upload Verilog text file")
        print("3. Exit")
        print("-------------------------------------------------------------------")
        choice = input("Enter your choice: ")
        if choice == "1":
            uploadUcf()
        elif choice == "2":
            upload_verilog()
        elif choice == "3":
            print("Exiting...")
            break
        else:
            print("Invalid choice! Exiting...")
            break

if __name__ == "__main__":
    main()
