import AppStoreBadge from "@/assets/applestor.png";
import GooglePlayBadge from "@/assets/playstore.png";
import Image from "next/image";

const FlagWave = () => {
  return (
    <>
      <div className="flex flex-col jutify-end items-end fixed bottom-[7rem] right-4 gap-4 max-sm:gap-2 max-sm:hidden max-md:bottom-[12rem]">
        Available-
        <a
          href="https://apps.apple.com/in/app/trai-myspeed/id1129080754"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src={AppStoreBadge} alt="App Store" className="w-22" />
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src={GooglePlayBadge} alt="Google Play" className="w-22" />
        </a>
      </div>
      <div className="w-full h-[100px] max-sm:h-auto fixed bottom-0 left-0 right-0">
        <img
          src="/images/flag-wave.svg"
          alt="indian-flag"
          className="w-full h-full scale-x-[-1] max-sm:object-contain max-sm:object-bottom"
        />
      </div>
    </>
  );
};

export default FlagWave;
