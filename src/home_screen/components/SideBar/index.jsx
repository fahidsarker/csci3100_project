import {BsPlus, BsFillLightningFill, BsGearFill, BsInfo} from 'react-icons/bs';
import {FaFire, FaPoo, FaSearch} from 'react-icons/fa';
import {AiOutlineLogout, BiSearch, FiLogOut} from "react-icons/all";

const SideBar = ({onClick}) => {
  return (
      // take full height of the screen
    <div className="fixed top-0 left-0 h-screen w-16 flex flex-col
                  bg-white dark:bg-gray-900 shadow-lg" >
                    
        <SideBarIcon icon={<FaFire size="28" onClick={()=> onClick('hide_show')}/>} />
        <Divider />
        <SideBarIcon icon={<BiSearch size="32" />} />
        <SideBarIcon icon={<BsInfo size="20" />} />
        <SideBarIcon icon={<BsGearFill size="20" />} />
        <Divider />
        <SideBarIcon icon={<FiLogOut size="22" />} />
    </div>
  );
};

const SideBarIcon = ({ icon, text = 'tooltip 💡' , onClick}) => (
  <div className="sidebar-icon group" onClick={() => onClick?.()}>
    {icon}
    <span class="sidebar-tooltip group-hover:scale-100">
      {text}
    </span>
  </div>
);


const Divider = () => <hr className="sidebar-hr" />;

export default SideBar;