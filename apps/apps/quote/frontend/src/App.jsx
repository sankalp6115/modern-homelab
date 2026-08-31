import "./styles/style.css"
import { getQuote } from "./api/api"
import { useState, useEffect } from "react";

const Quote = () => {
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await getQuote();
        setQuote(data.quote)
        setAuthor(data.author)
      }
      catch (e) {
        console.error("Error fetching quote:", e);
      }
    }
    fetchQuote();
  }, []);

  const [quote, setQuote] = useState("")
  const [author, setAuthor] = useState("")

  return (
    <div className="quote-app">
      <div className="quoteBox">
        <p className="quote">{quote}</p>
        <p className="author">{author}</p>
      </div>
    </div>
  )
}

export default Quote