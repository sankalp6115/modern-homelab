import subprocess
import os

def generate_self_signed_cert():
    cert_file = "cert.pem"
    key_file = "key.pem"
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("Certificates already exist. Skipping generation.")
        return

    print("Generating self-signed certificates...")
    try:
        # Using openssl to generate a self-signed certificate
        # This command creates a 2048-bit RSA key and a self-signed certificate valid for 365 days
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:4048", 
            "-keyout", key_file, "-out", cert_file, 
            "-days", "365", "-nodes", 
            "-subj", "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
        ]
        
        subprocess.run(cmd, check=True)
        print(f"Generated {cert_file} and {key_file}")
    except subprocess.CalledProcessError as e:
        print(f"Error generating certificates: {e}")
        print("Make sure 'openssl' is installed in your environment.")
    except FileNotFoundError:
        print("Error: 'openssl' command not found. Please install it (e.g., 'pkg install openssl' in Termux).")

if __name__ == "__main__":
    generate_self_signed_cert()
