import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {

    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                username: { lable: 'email', type: 'text', placeholder: 'email' },
                password: { lable: 'passoword', type: 'password', placeholder: 'password' }
            },
            async authorize(credentials: any) {

                return {
                    id: 'user1'
                }

            }
        }),
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        InstagramProvider({
            clientId: process.env.INSTAGRAM_CLIENT_ID || "",
            clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
        })
    ],
    pages: {
    signIn: "/signin"
  },
  secret: process.env.NEXTAUTH_SECRET
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default NextAuth(authOptions);