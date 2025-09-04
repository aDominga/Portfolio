




//To run use yarn dev




import { useRef, useMemo, useState, useEffect} from "react";
import { pages, pageAtom } from "./UI";
import { useHelper, useTexture, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Bone,
  BoxGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Vector3,
  SkinnedMesh,
  Skeleton,
  MeshStandardMaterial,
  SkeletonHelper,
  MathUtils,
  SRGBColorSpace,
  LinearSRGBColorSpace,
  Color
} from "three";
import { atom, useAtom } from 'jotai';
import * as easing from "maath/easing";

//Book properties
const easingFactor = 0.5;
const easingFactorFold = 0.3;
const insideCurveStrength = 0.18;
const outsideCurveStrength = .05;
const turningCurveStrength = .09;

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71 
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;


const pageGeometry = new BoxGeometry (
        PAGE_WIDTH,
        PAGE_HEIGHT,
        PAGE_DEPTH,
        PAGE_SEGMENTS,
        2
);


pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);
const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];


for ( let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const x = vertex.x;

    const skinIndex = Math.max(0 , Math.floor(x / SEGMENT_WIDTH));
    let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight,0 ,0);
}

pageGeometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(skinIndexes, 4)
);

pageGeometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");


const pageMaterials = [
    new MeshStandardMaterial({
        color: whiteColor,
    }),
    new MeshStandardMaterial({
        color: "#ff4c00",
    }),
    new MeshStandardMaterial({
        color: whiteColor,
    }),
    new MeshStandardMaterial({
        color: whiteColor,
    }),
];

pages.forEach((page) => {
    useTexture.preload(`/textures/${page.front}`);
    useTexture.preload(`/textures/${page.back}`);
    useTexture.preload(`/textures/book-cover-roughness`);
})
const Page = ({number, front, back, page, opened, bookClosed, ...props}) => {
    const [picture, picture2, pictureRoughness] = useTexture([
        `/textures/${front}`,
        `/textures/${back}`,
        // ...(number === 0 || number === pages.length -1 
        //     ? [ `/textures/book-cover-roughness.jpg`]
        //     : []),
    ]);
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
    const group = useRef();
    const turnedAt = useRef(0);
    const lastOpened = useRef(opened);

    const skinnedMeshRef = useRef();


    const manualSkinnedMesh = useMemo (() => {
        const bones = [];
        for (let i = 0; i <= PAGE_SEGMENTS; i++) {
            let bone = new Bone();
            bones.push(bone);
            if ( i === 0) {
                bone.position.x = 0;
            } else {
                bone.position.x = SEGMENT_WIDTH;
            } 
            if ( i > 0 ){
                bones[i - 1].add(bone);
            }
        }
        const skeleton = new Skeleton(bones);

        const materials = [...pageMaterials, 
            new MeshStandardMaterial ({
                roughness: 1,
                        metalness: 1,
                        emissive: "black",  // warm reflective tint
                        emissiveIntensity: 0,
                map: picture,
                ...(number === 0
                    ? {
                        roughnessMap: pictureRoughness,
                    }
                    : {
                        color: "",       // base color of the page
                        roughness: 1,
                        metalness: 1,
                        emissive: "black",  // warm reflective tint
                        emissiveIntensity: 0 //Glossyness
                    }),
                    // emissive: emissiveColor,
                    // emissiveIntensity: 0,
            }),
            new MeshStandardMaterial({
                roughness: 1,
                        metalness: 1,
                        emissive: "black",  // warm reflective tint
                        emissiveIntensity: 0,
                map: picture2,
                ...(number === pages.length -1 
                    ? {
                        roughnessMap: pictureRoughness,
                    }
                    : {
                        color: "",       // base color of the page
                        roughness: 1,
                        metalness: 1,
                        emissive: "black",  // warm reflective tint
                        emissiveIntensity: 0 //Glossyness
                    }),
                    // emissive: emissiveColor,
                    // emissiveIntensity: 0,
            }),
        ];
        const mesh = new SkinnedMesh(pageGeometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.add(skeleton.bones[0]);
        mesh.bind(skeleton);
        return mesh;
        
    }, []);

    // useHelper(skinnedMeshRef, SkeletonHelper, "red");

    useFrame((_, delta) =>{
        if (!skinnedMeshRef.current) {
            return;

        }
        const emissiveIntensity = highlighted ? 0.22 : 0;
        skinnedMeshRef.current.material[4].emissiveIntensity =
        skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
            skinnedMeshRef.current.material[4].emissiveIntensity,
            emissiveIntensity,
            0.1
        );



        if (lastOpened.current !== opened){
            turnedAt.current = +new Date();
            lastOpened.current = opened;
        }
        
        let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
        turningTime = Math.sin(turningTime * Math.PI);


        let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
        if (!bookClosed) {
        targetRotation += MathUtils.degToRad(number * 0.8);
        }


        const bones = skinnedMeshRef.current.skeleton.bones;
        for (let i = 0; i < bones.length; i++){
            const target = i === 0 ? group.current : bones[i];

            const insideCurveIntensity = i < 8 ? Math.sin(i * .275 + 0.35) : 0;
            const outsideCurveIntensity = i>= 8 ? Math.cos(i * 0.3 + .009) : 0;
            const turningIntensity = 
            Math.sin(i * Math.PI * ( 1/ bones.length)) * turningTime;



            let rotationAngle = 
                insideCurveStrength * insideCurveIntensity * targetRotation - 
                outsideCurveStrength * outsideCurveIntensity * targetRotation + 
                turningCurveStrength * turningIntensity * targetRotation;
                let foldRotationAngle = MathUtils.degToRad(Math.sin(targetRotation) * 2);

            if (bookClosed) {
                if (i===0) {
                    rotationAngle = targetRotation;
                    foldRotationAngle = 0;

                } else {
                    rotationAngle = 0;
                }
            }

            easing.dampAngle(
                target.rotation,
                "y",
                rotationAngle,
                easingFactor,
                delta
            );

            const foldIntensity = 
            i > 8
            ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime 
            : 0;
            easing.dampAngle(
                target.rotation,
                "x",
                foldRotationAngle * foldIntensity,
                easingFactorFold,
                delta
            );
        }

    });
    const [_, setPage] = useAtom(pageAtom);
    const [highlighted, setHighlighted] = useState(false);
    useCursor(highlighted);

    return (
        <group {...props} ref={group}
        onPointerEnter={(e) => {
            e.stopPropagation();
            setHighlighted(true);
        }}
        onPointerLeave={(e) => {
            e.stopPropagation();
            setHighlighted(false);
        }}
        onClick={(e) => {
            e.stopPropagation();
            setPage(opened ? number : number + 1);
            setHighlighted(false);
        }}
        >
           <primitive object={manualSkinnedMesh} ref={skinnedMeshRef}
           position-z={-number * PAGE_DEPTH +page * PAGE_DEPTH}
           />
        </group>
    );
};

export const Book = ({...props}) => {
    const [page] = useAtom(pageAtom);
    const [delayedPage, setDelayedPage] = useState(page);

    useEffect(() => {
        let timeout;
        const goToPage = () => {
            setDelayedPage((delayedPage) => {
                if (page === delayedPage){
                return delayedPage;
                } else {
                    timeout = setTimeout(
                        () => {
                            goToPage();
                        },
                        Math.abs(page - delayedPage) > 2 ? 50 : 150
                    );
                    if (page > delayedPage) {
                        return delayedPage + 1;
                    }
                    if (page < delayedPage) {
                        return delayedPage -1;
                    }
                }
            });
        };
        goToPage();
        return () => {
            clearTimeout(timeout);
        };
    }, [page]);

    return (
    <group {...props} rotation-y={-Math.PI / 2}>
        {
            [...pages].map((pageData, index) => (
                <Page 
                key={index}
                page={delayedPage}
                number={index} 
                opened={delayedPage > index}
                bookClosed={delayedPage === 0 || delayedPage === pages.length}
                {...pageData} />
            ))}
    </group>
    );
};