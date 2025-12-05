import Header from "./Header";
import TestOptions from "./TestOptions";
import PreviousResults from "./PreviousResults";
import StrongerNetwork from "./StrongerNetwork";
import Features from "./Features";
import Hero from "./Hero";

export default function SpeedChecker() {
    return (
    <>
        <Header></Header>

        <section 
        className="relative pb-16"
        style={{
            backgroundImage: `url('/images/hero-bg-image.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
        }}
        >
        <Hero />
        <TestOptions />
        <PreviousResults />
        </section>
        <StrongerNetwork />
        <Features />
    </>
    )
}