import bpy
import json
import os
import sys
import math
from mathutils import Euler, Vector

channel_types = ['Base Color', 'Metallic', 'Specular', 'Roughness', 'Transmission', 'Emission', 'Alpha', 'Normal', 'Occlusion']
channel_names = ['diffuse', 'metalness', 'specular', 'roughness', 'opacity', 'emissive', 'opacity', 'normal', 'occlusion']

def find_channel(node, channels):
    for output in node.outputs:
        for link in output.links:
            if link.to_socket.name in channel_types:
                channels.append(link.to_socket.name)
            else:
                find_channel(link.to_node, channels)
                


mesh_count = 0;
face_count = 0;
vertex_count = 0;

meshes=[]
materials=[]
textures=[]
scene={}

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

#get import file extension
filename, file_extension = os.path.splitext(argv[0])
file_extension = file_extension.lower()

#import scene
if file_extension == '.obj':
    bpy.ops.import_scene.obj(filepath=argv[0], axis_forward='-Z', axis_up='Y')
elif file_extension == '.ply':
    bpy.ops.import_mesh.ply(filepath=argv[0])
elif file_extension == '.stl':
    bpy.ops.import_mesh.stl(filepath=argv[0])
elif file_extension == '.fbx':
    bpy.ops.import_scene.fbx(filepath=argv[0])
elif file_extension == '.glb' or file_extension == '.gltf':
    bpy.ops.import_scene.gltf(filepath=argv[0])

if len(bpy.data.objects) > 0:
    init_bbox_corners = [bpy.data.objects[0].matrix_world @ Vector(corner) for corner in bpy.data.objects[0].bound_box]
    if file_extension == '.obj':
        init_bbox_corners = [Euler((math.radians(-90.0), 0.0, 0.0)).to_matrix() @ Vector(corner) for corner in init_bbox_corners]
    g_minx = g_maxx = init_bbox_corners[0].x;
    g_miny = g_maxy = init_bbox_corners[0].y;
    g_minz = g_maxz = init_bbox_corners[0].z;
else:
    g_minx = g_maxx = g_miny = g_maxy = g_minz = g_maxz = 0;

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        statistics={}
        statistics["numFaces"] = len(obj.data.polygons)
        statistics["numVertices"] = len(obj.data.vertices)
        statistics["numTexCoordChannels"] = len(obj.data.uv_layers.keys())
        statistics["numColorChannels"] = len(obj.data.vertex_colors)
        statistics["hasNormals"] = obj.data.has_custom_normals
        #statistics["hasTangents"] = obj.data.loops[0].tangent is not None
        statistics["hasTexCoords"] = obj.data.uv_layers.active is not None
        statistics["hasVertexColors"] = len(obj.data.vertex_colors) > 0
        statistics["hasBones"] = obj.find_armature() is not None

        material_indices = []
        
        for mat in obj.data.materials.keys():
            if mat not in materials:
                material_indices.append(len(materials))
                materials.append(mat)
            else:
                material_indices.append(materials.index(mat))
                
        statistics["materialIndex"] = material_indices
                
        
        bbox_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]

        if file_extension == '.obj':
            bbox_corners = [Euler((math.radians(-90.0), 0.0, 0.0)).to_matrix() @ Vector(corner) for corner in bbox_corners]
        
        minx = maxx = bbox_corners[0].x
        miny = maxy = bbox_corners[0].y
        minz = maxz = bbox_corners[0].z
        
        for vec in bbox_corners:
            minx = min(minx, vec.x)
            maxx = max(maxx, vec.x)
            miny = min(miny, vec.y)
            maxy = max(maxy, vec.y)
            minz = min(minz, vec.z)
            maxz = max(maxz, vec.z)

        bb_min = [minx, miny, minz]
        bb_max = [maxx, maxy, maxz]
        
        bounds = {
            "min" : bb_min,
            "max" : bb_max
        }
        
        g_minx = min(g_minx, minx)
        g_maxx = max(g_maxx, maxx)
        g_miny = min(g_miny, miny)
        g_maxy = max(g_maxy, maxy)
        g_minz = min(g_minz, minz)
        g_maxz = max(g_maxz, maxz)
        
        geometry={}
        geometry["boundingBox"] = bounds
        geometry["center"] = [(minx+maxx)/2.0, (miny+maxy)/2.0, (minz+maxz)/2.0]
        geometry["size"] = [maxx-minx, maxy-miny, maxz-minz]
        
        mesh = {
            "geometry" : geometry,
            "statistics" : statistics
        }
        
        meshes.append(mesh)
        mesh_count += 1
        face_count += statistics["numFaces"]
        vertex_count += statistics["numVertices"]

scene_bounds = {
    "min" : [g_minx, g_miny, g_minz],
    "max" : [g_maxx, g_maxy, g_maxz]
}

scene_geometry={}
scene_geometry["boundingBox"] = scene_bounds
scene_geometry["center"] = [(g_minx+g_maxx)/2.0, (g_miny+g_maxy)/2.0, (g_minz+g_maxz)/2.0]
scene_geometry["size"] = [g_maxx-g_minx, g_maxy-g_miny, g_maxz-g_minz]

scene_materials=[]
for key in materials:
    g_material = bpy.data.materials[key]
    channels=[]

    nodes = g_material.node_tree.nodes
    for node in nodes:
        if node.type == 'TEX_IMAGE':
            out_channels = []
            channel_name = ""
            find_channel(node, out_channels)
            if len(out_channels) == 0:
                channel = {
                "type" : "unknown",
                "uri" : node.image.name
                }
                channels.append(channel)
            else:
                for name in out_channels:
                    channel = {
                    "type" : channel_names[channel_types.index(name)],
                    "uri" : node.image.name
                    }
                    channels.append(channel)
            if node.image.name not in textures:
                textures.append(node.image.name)
                    
    
    mat = {
        "name" : key,
        "channels" : channels
    }
    
    scene_materials.append(mat)
    
scene_statistics =  {
    "numAnimations": len(bpy.data.actions),
    "numCameras": len(bpy.data.cameras),
    "numFaces": face_count,
    "numLights": len(bpy.data.lights),
    "numMaterials": len(materials),
    "numMeshes": mesh_count,
    "numTextures": len(textures),
    "numVertices": vertex_count
}

scene = {
    "geometry" : scene_geometry,
    "materials" : scene_materials,
    "statistics" : scene_statistics
}

report = {
    "meshes": meshes,
    "scene": scene,
    "type": "report"
}

print("JSON="+json.dumps(report))

### encode report as JSON 
##data = json.dumps(report, indent=1, ensure_ascii=True)
##
### set output path
##dir = os.path.dirname(filename)
##file_name = os.path.join(dir, "blender_inspection_report.json")
##
### write JSON file
##with open(file_name, 'w') as outfile:
##    outfile.write(data + '\n')

