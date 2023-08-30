import Metashape
import csv
import sys
import os
import math
import argparse
from os import walk, path
from statistics import mean, pstdev, variance

def convert(s):
    if s.lower() == "true":
        return True
    else:
        return False

def mag(x): 
    return math.sqrt(sum(i**2 for i in x))

def findLowProjectionCameras(chunk, cameras, limit):
    point_cloud = chunk.tie_points
    projections = point_cloud.projections
    points = point_cloud.points
    npoints = len(points)
    tracks = point_cloud.tracks
    point_ids = [-1] * len(point_cloud.tracks)

    for point_id in range(0, npoints):
        point_ids[points[point_id].track_id] = point_id

    for camera in cameras:
        nprojections = 0

        if not camera.transform:
            camera.enabled = False
            print(camera, "NO ALIGNMENT")
            continue

        for proj in projections[camera]:
            track_id = proj.track_id
            point_id = point_ids[track_id]
            if point_id < 0:
                continue
            if not points[point_id].valid:
                continue

            nprojections += 1

        if nprojections <= limit:
            camera.enabled = False
            print(camera, nprojections, len(projections[camera]))

def matrixFromAxisAngle(axis, angle):

    c = math.cos(angle)
    s = math.sin(angle)
    t = 1.0 - c

    m00 = c + axis[0]*axis[0]*t
    m11 = c + axis[1]*axis[1]*t
    m22 = c + axis[2]*axis[2]*t

    tmp1 = axis[0]*axis[1]*t
    tmp2 = axis[2]*s
    m10 = tmp1 + tmp2
    m01 = tmp1 - tmp2
    tmp1 = axis[0]*axis[2]*t
    tmp2 = axis[1]*s
    m20 = tmp1 - tmp2
    m02 = tmp1 + tmp2
    tmp1 = axis[1]*axis[2]*t
    tmp2 = axis[0]*s
    m21 = tmp1 + tmp2
    m12 = tmp1 - tmp2

    return Metashape.Matrix([[m00, m01, m02],[m10, m11, m12],[m20, m21, m22]])

def model_to_origin(chunk):
	model = chunk.model
	if not model:
		print("No model in chunk, script aborted")
		return 0
	vertices = model.vertices
	T = chunk.transform.matrix

	minx = vertices[0].coord[0]
	maxx = vertices[0].coord[0]
	miny = vertices[0].coord[1]
	maxy = vertices[0].coord[1]
	minz = vertices[0].coord[2]
	maxz = vertices[0].coord[2]
	for i in range(0, len(vertices)):
		minx = min(minx,vertices[i].coord[0])
		maxx = max(maxx,vertices[i].coord[0])
		miny = min(miny,vertices[i].coord[1])
		maxy = max(maxy,vertices[i].coord[1])
		minz = min(minz,vertices[i].coord[2])
		maxz = max(maxz,vertices[i].coord[2])
	print(minx,maxx,miny,maxy,minz,maxz)
	avg = Metashape.Vector([(minx+maxx)/2.0,(miny+maxy)/2.0,(minz+maxz)/2.0])
	#chunk.region.center = avg
	chunk.transform.translation = chunk.transform.translation - T.mulp(avg)


#get args
argv = sys.argv

#parse args
parser = argparse.ArgumentParser()
parser.add_argument("-i", "--input", required=True, help="Input filepath")
parser.add_argument("-c", "--cameras", required=True, help="Cameras filepath")
parser.add_argument("-o", "--output", required=True, help="Output filename")
parser.add_argument("-al", "--align_limit", required=False, help="Alignment threshold (%)")
parser.add_argument("-sb", required=False, help="Scalebar definition file")
parser.add_argument("-optm", required=False, default="False", help="Optimize markers")
parser.add_argument("-bdc", required=False, default="False", help="Build dense cloud")
parser.add_argument("-tp", required=False, default=25000, help="Tiepoint limit")
parser.add_argument("-kp", required=False, default=75000, help="Keypoint limit")
parser.add_argument("-gp", required=False, default="True", help="Generic preselection")
parser.add_argument("-dmn", required=False, default=16, help="Depth map max neighbors")
parser.add_argument("-ttg", required=False, default="False", help="Process turntable groups")
parser.add_argument("-mq", required=False, default=2, help="Model resolution quality")
parser.add_argument("-cfc", required=False, default=3000000, help="Custom model face count")
args = parser.parse_args()

doc = Metashape.app.document
chunk = doc.addChunk()

imagePath = args.input
camerasPath = args.cameras
processGroups = convert(args.ttg)
genericPreselection = convert(args.gp)
name = os.path.basename(os.path.normpath(args.output))
name = os.path.splitext(name)[0];

# Grab images from directory (include subdirectories)
imageFiles=[]
for r, d, f in walk(imagePath):
    for i, file in enumerate(f):
        imageFiles.append(os.path.join(r, file))

# set 'Scale Bar Accuracy' to 0.0001
chunk.scalebar_accuracy = 0.0001
# set 'Tie Point Accuracy' to 0.1
chunk.tiepoint_accuracy = 0.1
# set 'Marker Projection Accuracy' to 0.1
chunk.marker_projection_accuracy = 0.1

# Add photos
chunk.addPhotos(imageFiles)

# Sort into camera groups (if needed)
camera_groups = {}
camera_refs = dict()
if processGroups == True:
    for photo in chunk.cameras:
        name = str(photo.label)
        # Remove the sequence number from the base name (CaptureOne Pro formatting)
        base_name_without_sequence_number = name[0:name.rfind("_")]
        #print(name + " --> " + base_name_without_sequence_number)

        # If this naming pattern doesn't have a camera group yet, create one
        if base_name_without_sequence_number not in camera_groups:
            camera_group = chunk.addCameraGroup()
            camera_group.label = base_name_without_sequence_number
            camera_groups[base_name_without_sequence_number] = camera_group
            camera_refs[base_name_without_sequence_number] = []

        # Add the camera to the appropriate camera group
        photo.group = camera_groups[base_name_without_sequence_number]

        camera_refs[base_name_without_sequence_number].append(photo)

chunk.matchPhotos\
(
    downscale=1,
    generic_preselection=genericPreselection,
    reference_preselection=False,
    #reference_preselection_mode=Metashape.ReferencePreselectionSource,
    filter_mask=False,
    mask_tiepoints=False,
    keypoint_limit=args.kp,
    tiepoint_limit=args.tp,
    keep_keypoints=False,
    guided_matching=False,
    reset_matches=False
)

# align the matched image pairs
chunk.alignCameras()

# evaluate alignment based on groups
if processGroups == True:

    findLowProjectionCameras(chunk, chunk.cameras, 100)

    # Sort cameras and reset bad ones
    good_cameras = []
    bad_cameras = []
    for camera in chunk.cameras:
        if camera.enabled == False:
            bad_cameras.append(camera)
        else:
            good_cameras.append(camera)
    print(len(bad_cameras))
    for camera in bad_cameras:
        camera.transform = None

    chunk.optimizeCameras( adaptive_fitting=True )

    # Try to realign flagged cameras
    for camera in bad_cameras:
        camera.enabled = True
        chunk.alignCameras([camera])  

    findLowProjectionCameras(chunk, bad_cameras, 100)

    # Try to realign again for good measure
    for camera in bad_cameras:
        if camera.enabled == False:
            camera.transform = None
            camera.enabled = True
            chunk.alignCameras([camera])

    findLowProjectionCameras(chunk, bad_cameras, 20)

    bad_cameras = []
    for camera in chunk.cameras:
        if camera.enabled == False:
            bad_cameras.append(camera)
            camera.transform = None
    print(len(bad_cameras))

    # compute overall mean deviation
    tot_avg = [0,0,0]
    tot_dev = []
    tot_count = 0
    for camera in chunk.cameras:
        if camera.center != None:
            tot_count += 1
            for i, bi in enumerate(camera.center): tot_avg[i] += bi
        else:
            camera.enabled = False
    tot_avg[0] /= tot_count
    tot_avg[1] /= tot_count
    tot_avg[2] /= tot_count
    for camera in chunk.cameras:
        if camera.center != None:
            camera_err = [0,0,0]
            camera_err[0] = camera.center[0] - tot_avg[0]
            camera_err[1] = camera.center[1] - tot_avg[1]
            camera_err[2] = camera.center[2] - tot_avg[2]
            tot_dev.append(mag(camera_err))
    avg_dev = mean(tot_dev)
    #print("AVG DEV: "+str(avg_dev))

    # Identify cameras that are too tightly clustered within a group
    local_centers = []
    for group in camera_refs.keys():
        camera_count = 0

        pos_avg = [0,0,0]
        for camera in camera_refs[group]:
            if camera.center != None:
                camera_count += 1
                for i, bi in enumerate(camera.center): pos_avg[i] += bi
        pos_avg[0] /= camera_count
        pos_avg[1] /= camera_count
        pos_avg[2] /= camera_count
        local_centers.append(pos_avg)

        loc_dev_arr = []
        for camera in camera_refs[group]:
            if camera.center != None:
                camera_err = [0,0,0]
                camera_err[0] = camera.center[0] - pos_avg[0]
                camera_err[1] = camera.center[1] - pos_avg[1]
                camera_err[2] = camera.center[2] - pos_avg[2]
                loc_dev_arr.append(mag(camera_err))
                if mag(camera_err) < avg_dev * 0.1:
                    if camera.enabled != False:
                        camera.enabled = False
                        bad_cameras.append(camera)
        #grp_variance = variance(loc_dev_arr)
        #std_dev = pstdev(loc_dev_arr)
        #print(group, grp_variance, std_dev)

    #chunk.remove(bad_cameras)


    # calculate center points
    chunk_ctr = chunk.region.center
    max_dist = 0
    max_idx = -1
    for i, pos in enumerate(local_centers):
        dist = mag([chunk_ctr[0] - pos[0], chunk_ctr[1] - pos[1], chunk_ctr[2] - pos[2]])
        print(dist, max_idx)
        if dist > max_dist:
            max_dist = dist
            max_idx = i
    
    # add line shape for up axis
    #chunk.shapes = Metashape.Shapes()
    #chunk.shapes.crs = chunk.crs
    #new_shape = chunk.shapes.addShape()
    #new_shape.geometry.type = Metashape.Geometry.Type.LineStringType
    #new_shape.geometry = Metashape.Geometry.LineString([Metashape.Vector(chunk_ctr), Metashape.Vector(local_centers[max_idx])])

    curr_dir = Metashape.Vector(local_centers[max_idx]) - Metashape.Vector(chunk_ctr)
    curr_dir = curr_dir.normalized()
    angle = math.acos(sum( [curr_dir[i]*[0,0,1][i] for i in range(len([0,0,1]))] ))
    axis = Metashape.Vector.cross(curr_dir,[0,0,1]).normalized()

    rot_offset = matrixFromAxisAngle(axis, angle)

    R = chunk.region.rot*(rot_offset*chunk.region.rot.inv())		#Bounding box rotation matrix
    C = chunk.region.center		#Bounding box center vector
    T = Metashape.Matrix( [[R[0,0], R[0,1], R[0,2], C[0]], [R[1,0], R[1,1], R[1,2], C[1]], [R[2,0], R[2,1], R[2,2], C[2]], [0, 0, 0, 1]])
    
    chunk.transform.matrix = Metashape.Matrix.Rotation(rot_offset)*Metashape.Matrix.Translation(C).inv() #T.inv()

# save post-alignment
doc.save(imagePath+"\\..\\"+name+"-align.psx")
chunk = doc.chunks[0]

aligned = [camera for camera in chunk.cameras if camera.transform and camera.type==Metashape.Camera.Type.Regular]
success_ratio = len(aligned) / len(chunk.cameras) * 100
print("ALIGNMENT SUCCESS: "+str(success_ratio))
#sys.exit(1)
# exit out if alignment is less than requirement
if success_ratio < int(args.align_limit):
    sys.exit("Error: Image alignment does not meet minimum threshold")

# optimize cameras
chunk.optimizeCameras( adaptive_fitting=True )

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
    max_neighbors=args.dmn,
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

modelQuality = [Metashape.FaceCount.LowFaceCount, Metashape.FaceCount.MediumFaceCount, Metashape.FaceCount.HighFaceCount, Metashape.FaceCount.CustomFaceCount]

chunk.buildModel\
(
    surface_type=Metashape.Arbitrary,
    interpolation=Metashape.DisabledInterpolation,
    face_count = modelQuality[3] if int(args.mq) < 0 else modelQuality[int(args.mq)],
    face_count_custom = 0 if int(args.mq) < 0 else args.cfc,
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
    #adaptive_resolution=False
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

# Move model to center
model_to_origin(chunk)

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

chunk.exportCameras(camerasPath)
chunk.exportReport(imagePath+"\\..\\"+name+"-report.pdf")

doc.save(imagePath+"\\..\\"+name+"-mesh.psx", [chunk])
