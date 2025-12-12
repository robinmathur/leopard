uvicorn leopard.asgi:application --port 8000 --workers 1 --log-level debug --reload

// Sample code to connect with websocket
encodedToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzIyNjM5MTMwLCJpYXQiOjE3MjI2MzU1MzAsImp0aSI6IjQ4Mjc4NDUwMWNhMDQxZWU5NDYxMzRmZmQxMzcyOTA5IiwidXNlcl9pZCI6Mn0.MwMiawMVc0lAjaNCMLOxPalXXpV5pUr2aevVYZp-RZd8bfn9dh2HW2uM9b_etkvbzQTXWwY92eX6GdIzzwg5d3pV3hdAg8lst3tpRJ3iD2aiObPLsuxRHSXKvdfCgm5KAMbiuZXQ0NedIYGYQj86RK_rQu7X75ITwBDKxMdAD56qUdZou-BUvnIjdHKs5s8sG71Bjrxs-E4KG__gN35Gs81mPKE11N4X3Avh40hYlAS9BAlcHuG3cScroQPzPJUX5zOw1QtNon7_Ktu9ta5y5dSaLWh4ZXeh3UynM7_GXXsR9pjmXWdVA1eXbgo4_mm0tEPLRMbnpO-PAj9lxTbvwA'
const chatSocket = new WebSocket(`ws://localhost:8000/ws/notification/?token=${encodedToken}`);

chatSocket.onopen = function() {
  console.log('WebSocket connection established.');
  const message = {
    'message': 'Hello, world!'
  };
  chatSocket.send(JSON.stringify(message));
};

chatSocket.onmessage = function(event) {
  const message = JSON.parse(event.data);
  console.log('Received message:', message);
};



// Create RSA keys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)

# Serialize the private key to PEM format
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# Generate public key from private key
public_key = private_key.public_key()

# Serialize the public key to PEM format
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Print the PEM keys
print("Private Key:")
print(private_pem.decode())

print("\nPublic Key:")
print(public_pem.decode())