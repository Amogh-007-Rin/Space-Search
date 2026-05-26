import { BrainCircuit, Bubbles, CircleGauge, Cog, Component, LayoutDashboard, Telescope, TrainFront } from "lucide-react";
import Sbutton from "./buttons/Sbutton";

export default function Sidebar() {
    return (
        <div className="side-bar w-full h-full border-r border-zinc-900 flex flex-col items-center justify-evenly">
            <div className="side-1 w-full h-[10%] flex justify-center items-center py-5">
                <TrainFront color="white" size={36} />
            </div>
            <div className="side-2 w-full h-[80%] flex flex-col gap-7 items-center justify-start py-6">
                <Sbutton>
                    <LayoutDashboard />
                </Sbutton>
                <Sbutton>
                    <Telescope />
                </Sbutton>
                <Sbutton>
                    <CircleGauge />
                </Sbutton>
                <Sbutton>
                    <Bubbles />
                </Sbutton>
                <Sbutton>
                    <BrainCircuit />
                </Sbutton>
                <Sbutton>
                    <Component />
                </Sbutton>
            </div>
            <div className="side-3 w-full h-[10%] flex items-center justify-center">
                <Sbutton><Cog /></Sbutton>
            </div>
        </div>
    );
};