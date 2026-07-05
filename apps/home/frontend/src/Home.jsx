import React from "react";
import "./styles/style.css"

const Home = () => {
    console.log(import.meta.env.BASE_URL)
    return (
        <>
            <main className="home">
                <section className="app" id="melodious"><img src={`${import.meta.env.BASE_URL}assets/home/melodious.png`} style={{ width: 200, height: 200 }} /></section>
                <section className="app" id="monitor"><img src={`${import.meta.env.BASE_URL}assets/home/monitor.png`} style={{ width: 200, height: 200 }} /></section>
                <section className="app" id="downloader"><img src={`${import.meta.env.BASE_URL}assets/home/downloader.png`} style={{ width: 200, height: 200 }} /></section>
                <section className="app" id="file_server"><img src={`${import.meta.env.BASE_URL}assets/home/file_server.png`} style={{ width: 200, height: 200 }} /></section>
            </main>
        </>
    )
}

export default Home