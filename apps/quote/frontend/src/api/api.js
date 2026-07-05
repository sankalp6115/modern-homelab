export const getQuote = async () => {
    const result = await fetch("http://localhost:8000/quote");
    const { quote, author } = await result.json();
    return { quote, author };
}