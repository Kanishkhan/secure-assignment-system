async function testRegistration() {
    try {
        console.log('Testing Registration...');
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                email: 'test_' + Date.now() + '@example.com',
                password: 'password123',
                role: 'student'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('SUCCESS:', data);
        } else {
            console.error('FAILURE:', data);
        }
    } catch (error) {
        console.error('NETWORK ERROR:', error.message);
    }
}

// Wait a moment for server to be fully ready
setTimeout(testRegistration, 2000);
