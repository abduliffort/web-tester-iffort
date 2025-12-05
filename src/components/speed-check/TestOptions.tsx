import { section } from "framer-motion/client";
import TestOptionBox from "./TestOptionBox";

const TestOptions = () => {
  return (
    <>
    <section className="py-16 px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <TestOptionBox imgSrc="/images/quick-test-logo.png" boxName="Quick Test" text="Check speed, latency, packet loss, and jitter as you move." btnText="Start Quick Test" boxStyle={{backgroundColor:"rgba(255, 243, 235, 1)"}}></TestOptionBox>
            <TestOptionBox isRecommended={true} imgSrc="/images/full-test-logo.png" boxName="Full Test" text="Check speed, latency, packet loss, jitter, streaming, browsing delay." btnText="Start Full Test" boxStyle={{backgroundColor:"rgba(241, 233, 255, 1)"}}></TestOptionBox>
            <TestOptionBox imgSrc="/images/continuous-test-logo.png" boxName="Continuous Test" text="Check how stable and dependable your internet is." btnText="Start Continuous Test" boxStyle={{backgroundColor:"rgba(254, 241, 255, 1)"}}></TestOptionBox>
        </div>
        <p className="text-center text-sm text-gray-500 mt-8">
            <strong>Permission Required:</strong> To ensure better results for you, we require access to your location and your basic internet details. Your data is safe with us.
        </p>
    </section>
    </>
  );
};

export default TestOptions;