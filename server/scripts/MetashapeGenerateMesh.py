import Metashape
import csv
import argparse
from os import walk, path

def convert(s):
    if s.lower() == "true":
        return True
    else:
        return False

#get args
argv = sys.argv

#parse args
parser = argparse.ArgumentParser()
parser.add_argument("-i", "--input", required=True, help="Input filepath")
parser.add_argument("-o", "--output", required=True, help="Output filename")
parser.add_argument("-sb", required=False, help="Scalebar definition file")
parser.add_argument("-optm", required=False, default="False", help="Optimize markers")
parser.add_argument("-bdc", required=False, default="False", help="Build dense cloud")
args = parser.parse_args()

doc = Metashape.app.document
chunk = doc.addChunk()

imagePath = args.input
name = os.path.basename(os.path.normpath(imagePath))

# Grab images from directory (include subdirectories)
imageFiles=[]
for r, d, f in walk(imagePath):
    for i, file in enumerate(f):
        imageFiles.append(os.path.join(r, file))

# Add photos
chunk.addPhotos(imageFiles)

chunk.matchPhotos\
(
    downscale=0,
    generic_preselection=True,
    reference_preselection=False,
    #reference_preselection_mode=Metashape.ReferencePreselectionSource,
    filter_mask=False,
    mask_tiepoints=False,
    keypoint_limit=40000,
    tiepoint_limit=4000,
    keep_keypoints=False,
    guided_matching=False,
    reset_matches=False
)

# align the matched image pairs
chunk.alignCameras()

# optimize cameras
chunk.optimizeCameras\
(
    adaptive_fitting=True
)

if args.sb != None:
    ## Detect markers
    # Detect Circular 12bit coded markers
    # Coded target options: [CircularTarget12bit, CircularTarget14bit, CircularTarget16bit, CircularTarget20bit]
    chunk.detectMarkers\
    (
        target_type=Metashape.TargetType.CircularTarget12bit,
        tolerance=25,
        filter_mask=False,
        inverted=False,
        noparity=True,
        maximum_residual=5,
        minimum_size=0,
        minimum_dist=5
    )


    optimizeMarkerFlag = convert(args.optm);
    if optimizeMarkerFlag == True:
        """Optimize Marker Error Per Camera"""
        # print out the current projection count for each marker
        #for m in chunk.markers:
        #    print("Marker: " + m.label + " has " + str(len(m.projections)) + " projections")
        # for each marker in list of markers for active chunk, remove markers from each camera with error greater than 0.5
        for marker in chunk.markers:
            # skip marker if it has no position
            if not marker.position:
                #print(marker.label + " is not defined in 3D, skipping...")
                continue
            # reference the position of the marker
            position = marker.position
            # for each camera in the list of cameras for current marker
            for camera in marker.projections.keys():
                if not camera.transform:
                    continue

                proj = marker.projections[camera].coord
                reproj = camera.project(position)
                error = (proj - reproj).norm()

                # remove markers with projection error greater than 0.5
                if error > 0.5:
                    # set the current marker projection to none for current camera/marker combination
                    marker.projections[camera] = None
                    print("**** Removed: " + str(marker) + " with error of : " + str(error) + " ****")

        #for marker in chunk.markers:
        #    print("marker is " + str(marker.label))
        

    # Add scalebars
    with open(args.sb, newline='') as scalebarlist:
        reader = csv.DictReader(scalebarlist)
        for row in reader:
            marker1 = next((marker for marker in chunk.markers if marker.label == "target "+row['marker1']), None)
            marker2 = next((marker for marker in chunk.markers if marker.label == "target "+row['marker2']), None)
            ##print(row['marker1'] + " " + row['marker2'])
            if(marker1 != None and marker2 != None):
                bar = chunk.addScalebar(marker1, marker2)
                bar.reference.distance = float(row['distance'])
                print("Adding Scalebar " + row['marker1'] + " " + row['marker2'])

""" Build Dense Cloud Process"""
# build depth maps
# downscale = # 1=UltraHigh, 2=High, 4=Medium, 8=low
# Ultrahigh setting loads the image data at full resolution, High downsamples x2, medium downsamples x4, low x8
chunk.buildDepthMaps\
(
    downscale=1,
    filter_mode=Metashape.MildFiltering,
    reuse_depth=False,
    max_neighbors=16,
    subdivide_task=True,
    workitem_size_cameras=20,
    max_workgroup_size=100
)

denseCloudFlag = convert(args.bdc);
if denseCloudFlag == True:
    # build dense cloud
    # the quality of the dense cloud is determined by the quality of the depth maps
    # "max_neighbors" value of '-1' will evaluate ALL IMAGES in parallel. 200-300 is good when there is a lot of image overlap.
    # setting this value will fix an issue where there is excessive 'fuzz' in the dense cloud. the default value is 100.
    chunk.buildDenseCloud\
    (
        point_colors=True,
        point_confidence=True,
        keep_depth=True,
        max_neighbors=300,
        subdivide_task=True,
        workitem_size_cameras=20,
        max_workgroup_size=100
    )

modelQuality = [Metashape.FaceCount.HighFaceCount]

chunk.buildModel\
(
    surface_type=Metashape.Arbitrary,
    interpolation=Metashape.DisabledInterpolation,
    face_count=modelQuality[0],
    face_count_custom=200000,
    source_data = Metashape.DenseCloudData if denseCloudFlag == True else Metashape.DepthMapsData,
    vertex_colors=False,
    vertex_confidence=True,
    volumetric_masks=False,
    keep_depth=True,
    trimming_radius=10,
    subdivide_task=True,
    workitem_size_cameras=20,
    max_workgroup_size=100
)

# UV unwrap model
chunk.buildUV\
(
    mapping_mode=Metashape.GenericMapping,
    page_count=1,
    adaptive_resolution=False
)

chunk.buildTexture\
(
    blending_mode=Metashape.MosaicBlending,
    texture_size=8192,
    fill_holes=False,
    ghosting_filter=False,
    texture_type=Metashape.Model.DiffuseMap,
    transfer_texture=True
)

chunk.updateTransform()

chunk.exportModel\
(
    path=imagePath+"\\..\\"+args.output,
    binary=True,
    precision=6,
    texture_format=Metashape.ImageFormatTIFF,
    save_texture=True,
    save_uv=True,
    save_normals=True,
    save_colors=True,
    save_cameras=True,
    save_markers=True,
    save_udim=False,
    save_alpha=False,
    strip_extensions=False,
    raster_transform=Metashape.RasterTransformNone,
    colors_rgb_8bit=True,
    comment="Created via Metashape python",
    save_comment=True,
    format=Metashape.ModelFormatOBJ,
)

doc.save(imagePath+"\\..\\"+name+".psx")
