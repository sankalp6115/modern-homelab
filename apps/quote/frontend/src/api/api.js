export const getQuote = async () => {
    const result = await fetch("/quote");
    const { quote, author } = await result.json();
    return { quote, author };
}