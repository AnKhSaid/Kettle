import "./index.css";
import { Composition, Folder } from "remotion";
import { MatetAd } from "./MatetAd";
import { Option3 } from "./option3/Option3";
import { Opening } from "./scenes/Opening";
import { Product } from "./scenes/Product";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Options">
        {/* Option 1: the riddle story with the 3D kettle */}
        <Composition id="Option1-Story" component={MatetAd} durationInFrames={900} fps={30} width={1080} height={1920} />
        {/* Option 3: bold product ad built on the real product photo */}
        <Composition id="Option3-Product" component={Option3} durationInFrames={900} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Option1-Scenes">
        <Composition id="Opening" component={Opening} durationInFrames={291} fps={30} width={1080} height={1920} />
        <Composition id="Product" component={Product} durationInFrames={618} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
