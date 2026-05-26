interface sButtonProps{
    children?: React.ReactNode;
    onclick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function Sbutton({children, onclick}: sButtonProps){
    return(
        <button className="s-button w-10 h-10 rounded-full flex items-center justify-center text-zinc-800 cursor-pointer" onClick={onclick}>
            {children}
        </button>
    );
};

// bg-[#302f2f2a]