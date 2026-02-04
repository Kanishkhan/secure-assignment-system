async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'Admin',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Login Successful:", response.status, data);
        } else {
            console.log("Login Failed:", response.status, data);
        }

    } catch (err) {
        console.error("Request Error:", err.message);
    }
}

testLogin();
