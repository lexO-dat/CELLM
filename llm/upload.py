import os
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client
from dotenv import load_dotenv

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
    # Embedding model configuration
    # -------------------------------------------------
    embeddings = OllamaEmbeddings(
        base_url="http://localhost:11434",
        model="mxbai-embed-large:latest"
    )

    # -------------------------------------------------
    # vectorstore conection
    # -------------------------------------------------
    vectorstore = SupabaseVectorStore.from_documents(
        docs,
        embeddings,
        client=supabase,
        table_name="documents",
        query_name="match_documents" 
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
    # Embedding model configuration
    # -------------------------------------------------
    embeddings = OllamaEmbeddings(
        base_url="http://localhost:11434",
        model="mxbai-embed-large:latest"
    )

    # -------------------------------------------------
    # vectorstore conection
    # -------------------------------------------------
    vectorstore = SupabaseVectorStore.from_documents(
        docs,
        embeddings,
        client=supabase,
        table_name="documents_verilog",
        query_name="match_documents_verilog" 
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
