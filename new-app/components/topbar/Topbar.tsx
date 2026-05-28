import { CircleUserRound } from "lucide-react";
import Sbutton from "../buttons/Sbutton";

export default function Topbar() {
    return (
        <div className="top-bar w-full h-[7%] border-zinc-900 border-b text-white flex justify-between">
            <div className="top-left w-[9vw] h-full flex items-center justify-center">
                <h1 className="tracking-widest">Dashboard</h1>
            </div>
            <div className="top-right flex items-center justify-end w-[7vw] h-full px-7">
                <Sbutton><CircleUserRound /></Sbutton>
            </div>
        </div>
    );
};