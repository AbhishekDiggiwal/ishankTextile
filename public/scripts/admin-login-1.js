        // Firebase Auth instance safely loaded
        const auth = (window.firebaseServices && window.firebaseServices.auth) ? window.firebaseServices.auth : null;

        // Check if already logged in
        function checkAuth() {
            if (!auth) {
                showError('Admin authentication is unavailable. Please try again later.');
                return;
            }
            auth.onAuthStateChanged(async (user) => {
                if (!user) return;
                const isAdmin = await SecurityUtils.isAdminUser(user, true);
                if (isAdmin) {
                    SecurityUtils.navigate('admin-dashboard.html');
                    return;
                }
                await auth.signOut();
                showError('This account is not authorized for administration.');
            });
        }

        // Toggle password visibility
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.getElementById('toggleIcon');
            const toggleButton = toggleIcon.closest('button');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
                toggleButton.setAttribute('aria-label', 'Hide password');
                toggleButton.setAttribute('aria-pressed', 'true');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
                toggleButton.setAttribute('aria-label', 'Show password');
                toggleButton.setAttribute('aria-pressed', 'false');
            }
        }

        // Show error message
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            const form = document.getElementById('loginForm');

            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
            form.classList.add('shake');

            setTimeout(() => {
                form.classList.remove('shake');
            }, 500);
        }

        // Hide error message
        function hideError() {
            document.getElementById('errorMessage').classList.add('hidden');
        }

        // Login handler
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            hideError();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Validate inputs
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            if (!auth) {
                showError('Admin authentication is unavailable. Please try again later.');
                document.getElementById('password').value = '';
                return;
            }

            const setSessionPersistence = typeof auth.setPersistence === 'function'
                ? auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
                : Promise.resolve();

            // Sign in with Firebase Auth. Authorization is checked separately;
            // a valid Firebase account is not automatically an administrator.
            setSessionPersistence
                .then(() => auth.signInWithEmailAndPassword(email, password))
                .then(async (userCredential) => {
                    const isAdmin = await SecurityUtils.isAdminUser(userCredential.user, true);
                    if (!isAdmin) {
                        await auth.signOut();
                        throw new Error('not-authorized');
                    }
                    SecurityUtils.navigate('admin-dashboard.html');
                })
                .catch((error) => {
                    // Keep authentication errors deliberately generic so the
                    // form cannot be used to discover registered accounts.
                    const errorMessage = error.message === 'not-authorized'
                        ? 'This account is not authorized for administration.'
                        : 'Invalid email or password';
                    showError(errorMessage);
                    document.getElementById('password').value = '';
                });
        });

        // Clear error on input
        document.getElementById('email').addEventListener('input', hideError);
        document.getElementById('password').addEventListener('input', hideError);

        // Check auth status on page load
        checkAuth();
