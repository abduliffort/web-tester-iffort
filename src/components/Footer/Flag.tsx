import AppStoreBadge from "@/assets/applestor.png";
import GooglePlayBadge from "@/assets/playstore.png";
import { useDeviceType } from "@/hooks/useDeviceDetect";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";

const FlagWave = () => {
  const { deviceType } = useDeviceType();
  const t = useTranslation();

  return (
    <>
      {/* Desktop view unchanged */}
      <div className="sm:flex flex-col items-center jutify-end items-end fixed bottom-[9rem] max-md:bottom-[10rem] right-4 gap-4 max-sm:gap-2 max-sm:relative max-sm:w-full max-sm:flex-row max-sm:justify-evenly max-sm:items-center max-sm:px-4 max-sm:bottom-[3.3rem] max-sm:mx-4 hidden">
        <span className="max-sm:text-center text-size4 text-white/50">
          {t("Available on:")}
        </span>

        {(deviceType === "ios" || deviceType === "other") && (
          <a
            href="https://apps.apple.com/in/app/trai-myspeed/id1129080754"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src={AppStoreBadge} alt="App Store" className="w-[6rem]" />
          </a>
        )}

        {(deviceType === "android" || deviceType === "other") && (
          <a
            href="https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={GooglePlayBadge}
              alt="Google Play"
              className="w-[6rem]"
            />
          </a>
        )}
      </div>
      <div className="w-full h-[100px] max-sm:h-auto fixed bottom-0 left-0 right-0">
        <img
          src="/images/flag-wave.svg"
          alt="indian-flag"
          className="w-full h-full scale-x-[-1] object-contain object-bottom"
        />
      </div>
    </>
  );
};

export default FlagWave;
