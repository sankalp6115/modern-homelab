import "./../../styles/Searchbar.css";
import { useEffect, useRef } from "react";

const Searchbar = ({ localSearch, setLocalSearch }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className="search-container">
            <input
                type="text"
                className="search-input"
                name="searchBar"
                ref={inputRef}
                placeholder="Type Here to Search"
                id="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
            />
            <button type="button" className="search-icon-btn">
                <img src="/assets/images/ui/search.png" alt="Search" />
            </button>
        </div>
    );
};

export default Searchbar;