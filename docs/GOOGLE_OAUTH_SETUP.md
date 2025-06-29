# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for the Vito interface social login feature.

## Prerequisites

- Google account
- Access to Google Cloud Console
- Basic understanding of OAuth 2.0

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: `vito-interface-oauth`
   - Click "Create"

3. **Select Your Project**
   - Make sure your new project is selected in the project dropdown

## Step 2: Enable Required APIs

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"

2. **Enable Google+ API**
   - Search for "Google+ API"
   - Click on it and press "Enable"

3. **Enable Google Identity Services**
   - Search for "Google Identity Services API"
   - Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - In the left sidebar, click "APIs & Services" → "OAuth consent screen"

2. **Choose User Type**
   - Select "External" for public applications
   - Click "Create"

3. **Fill App Information**
   - **App name**: `Vito Interface`
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **App domain**: Your domain (e.g., `https://your-domain.com`)
   - **Developer contact information**: Your email address

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click "Update"

5. **Add Test Users** (for development)
   - Add email addresses that can test the OAuth flow
   - Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - In the left sidebar, click "APIs & Services" → "Credentials"

2. **Create Credentials**
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

3. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: `Vito Interface Web Client`

4. **Add Authorized Redirect URIs**
   - For development: `http://localhost:3000`
   - For production: `https://your-production-domain.com`
   - Click "Add URI" for each

5. **Create Client**
   - Click "Create"
   - **IMPORTANT**: Copy the Client ID (you'll need this)

## Step 5: Configure Environment Variables

1. **Copy Client ID**
   - From the credentials page, copy your OAuth 2.0 Client ID

2. **Update Environment File**
   - Copy `client/.env.example` to `client/.env.local`
   - Update the Google Client ID:
   ```bash
   REACT_APP_GOOGLE_CLIENT_ID=your-actual-google-client-id-here
   ```

3. **Verify Configuration**
   - Make sure the Client ID doesn't contain any extra spaces
   - Ensure it starts with your project number

## Step 6: Test the Integration

1. **Start Development Server**
   ```bash
   cd client
   npm start
   ```

2. **Test Google OAuth Flow**
   - Click "Connect" in the header
   - Click "Social Login" (should be first option)
   - Click "Google" provider
   - Complete Google OAuth flow
   - Verify wallet connection success

## Security Considerations

### Development vs Production

**Development:**
- Use `http://localhost:3000` as redirect URI
- Test with limited user accounts
- Keep Client ID in `.env.local` (not committed to git)

**Production:**
- Use HTTPS domains only
- Add all production domains to authorized redirect URIs
- Use environment variables for Client ID
- Consider using Google Cloud Secret Manager

### Best Practices

1. **Environment Variables**
   - Never commit Client IDs to version control
   - Use different Client IDs for development and production
   - Validate environment variables on app startup

2. **Domain Security**
   - Only add trusted domains to redirect URIs
   - Use HTTPS in production
   - Validate redirect URIs server-side if applicable

3. **User Data**
   - Only request necessary scopes
   - Handle user data according to privacy policies
   - Implement proper logout functionality

## Troubleshooting

### Common Issues

1. **"OAuth client not found" Error**
   - Verify Client ID is correct
   - Check that the project is selected correctly
   - Ensure APIs are enabled

2. **"Redirect URI mismatch" Error**
   - Add your current domain to authorized redirect URIs
   - Check for typos in the URI
   - Ensure protocol (http/https) matches

3. **"Access blocked" Error**
   - Add your email to test users in OAuth consent screen
   - Verify app is not in production mode without verification

4. **"Invalid Client ID" Error**
   - Check environment variable name: `REACT_APP_GOOGLE_CLIENT_ID`
   - Verify no extra spaces in Client ID
   - Restart development server after changing env vars

### Debug Steps

1. **Check Browser Console**
   - Look for Google OAuth errors
   - Verify Client ID is loaded correctly

2. **Verify Environment Variables**
   ```javascript
   console.log('Google Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
   ```

3. **Test OAuth Flow**
   - Use browser developer tools to inspect network requests
   - Check for CORS errors
   - Verify Google OAuth popup appears

## Production Deployment

### Before Going Live

1. **App Verification**
   - Submit app for Google verification if using sensitive scopes
   - Complete OAuth consent screen verification

2. **Domain Configuration**
   - Add all production domains to authorized redirect URIs
   - Remove development URIs from production credentials

3. **Environment Setup**
   - Use production Client ID
   - Secure environment variable storage
   - Test OAuth flow on production domain

### Monitoring

1. **Google Cloud Console**
   - Monitor OAuth usage in APIs & Services dashboard
   - Check for quota limits and errors

2. **Application Logs**
   - Log OAuth success/failure events
   - Monitor wallet generation and connection

## Support

For additional help:
- [Google Identity Documentation](https://developers.google.com/identity)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console Help](https://cloud.google.com/support)
