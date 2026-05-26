import Mainbar from "@/components/Mainbar";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="w-screen h-screen flex">
        <div className="left-main-container w-[5%] h-full">
          <Sidebar></Sidebar>
        </div>
        <div className="right-main-container w-[95%] h-full">
          <Topbar></Topbar>
          <Mainbar></Mainbar>
        </div>
      </div>
    </>
  );
};
