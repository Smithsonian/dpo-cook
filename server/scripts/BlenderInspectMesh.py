import bpy
import json
import os
import sys
import math
import bmesh
import struct
from io_mesh_stl import stl_utils
from mathutils import Vector, Euler, bvhtree

channel_types = ['Base Color', 'Metallic', 'Specular', 'Roughness', 'Transmission', 'Emission', 'Alpha', 'Normal', 'Occlusion']
channel_names = ['diffuse', 'metalness', 'specular', 'roughness', 'opacity', 'emissive', 'opacity', 'normal', 'occlusion']

def find_channel(node, channels):
    for output in node.outputs:
        for link in output.links:
            if link.to_socket.name in channel_types:
                channels.append(link.to_socket.name)
            else:
                find_channel(link.to_node, channels)
                
def is_manifold(object: bpy.types.Object, check_boundaries = True) -> bool:
    bpy.context.view_layer.objects.active = object
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_non_manifold(extend=False, use_boundary=check_boundaries)
    bm = bmesh.from_edit_mesh(object.data)

    is_manifold = True
    
    for v in bm.verts:
        if v.select:
            is_manifold = False
            break
        
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = None
    
    return is_manifold

def self_intersecting(object: bpy.types.Object) -> bool:
    bpy.context.view_layer.objects.active = object
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(object.data)

    is_intersecting = False

    bvh_tree = bvhtree.BVHTree.FromBMesh(bm, epsilon=0.000001)
    intersections = bvh_tree.overlap(bvh_tree)

    if intersections:
        is_intersecting = True
        
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = None
    
    return is_intersecting

# Check for ply format - pulled from importer (import_ply.py)
def is_ply_ascii(filepath) -> bool:
    import re
    
    with open(filepath, 'rb') as plyf:
        signature = plyf.peek(5)

        custom_line_sep = None
        if signature[3] != ord(b'\n'):
            if signature[3] != ord(b'\r'):
                print("Unknown line separator")
                return invalid_ply
            if signature[4] == ord(b'\n'):
                custom_line_sep = b"\r\n"
            else:
                custom_line_sep = b"\r"

        # Work around binary file reading only accepting "\n" as line separator.
        plyf_header_line_iterator = lambda plyf: plyf
        if custom_line_sep is not None:
            def _plyf_header_line_iterator(plyf):
                buff = plyf.peek(2**16)
                while len(buff) != 0:
                    read_bytes = 0
                    buff = buff.split(custom_line_sep)
                    for line in buff[:-1]:
                        read_bytes += len(line) + len(custom_line_sep)
                        if line.startswith(b'end_header'):
                            # Since reader code might (will) break iteration at this point,
                            # we have to ensure file is read up to here, yield, amd return...
                            plyf.read(read_bytes)
                            yield line
                            return
                        yield line
                    plyf.read(read_bytes)
                    buff = buff[-1] + plyf.peek(2**16)
            plyf_header_line_iterator = _plyf_header_line_iterator

        valid_header = False
        for line in plyf_header_line_iterator(plyf):
            tokens = re.split(br'[ \r\n]+', line)

            if len(tokens) == 0:
                continue
            if tokens[0] == b'end_header':
                valid_header = True
                break
            elif tokens[0] == b'comment':
                continue
            elif tokens[0] == b'obj_info':
                continue
            elif tokens[0] == b'format':
                format = tokens[1]
                break
        
        if format == b'ascii':
            return True
        
        return False

def run():
    mesh_count = 0
    face_count = 0
    vertex_count = 0
    tri_count = 0
    edge_count = 0

    meshes=[]
    materials=[]
    textures=[]
    embedded_textures=[]
    scene={}

    isAscii = True
    isDracoCompressed = False

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()

    #get args
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]

    #get import file extension
    filename, file_extension = os.path.splitext(argv[0])
    file_extension = file_extension.lower()

    #import scene
    if file_extension == '.obj':
        bpy.ops.wm.obj_import(filepath=argv[0])
    elif file_extension == '.ply':
        bpy.ops.import_mesh.ply(filepath=argv[0])
        isAscii = is_ply_ascii(argv[0])
    elif file_extension == '.stl':
        bpy.ops.import_mesh.stl(filepath=argv[0])
        with open(argv[0], 'rb') as data:
            isAscii = stl_utils._is_ascii_file(data)
    elif file_extension == '.x3d':
        bpy.ops.import_scene.x3d(filepath=argv[0])
    elif file_extension == '.dae':
        bpy.ops.wm.collada_import(filepath=argv[0])
    elif file_extension == '.fbx':
        bpy.ops.import_scene.fbx(filepath=argv[0])
        isAscii = False
    elif file_extension == '.glb' or file_extension == '.gltf':
        bpy.ops.import_scene.gltf(filepath=argv[0])
        if file_extension == '.glb':
            isAscii = False
        with open(argv[0], 'rb') as data:
            #read header to see if using compression
            content = memoryview(data.read())
            chunk_header = struct.unpack_from('<I4s', content, 12)
            data_length = chunk_header[0]
            data_type = chunk_header[1]
            data_gltf = content[12 + 8: 12 + 8 + data_length]
            gltf_string = data_gltf.tobytes().decode('utf-8')
            if "KHR_draco_mesh_compression" in gltf_string:
                isDracoCompressed = True
    else:
        print("Error: Unsupported file type: " + file_extension)
        sys.exit(1)

    if len(bpy.data.objects) > 0:
        init_bbox_corners = [bpy.data.objects[0].matrix_world @ Vector(corner) for corner in bpy.data.objects[0].bound_box]
        if file_extension == '.obj':
            init_bbox_corners = [Euler((math.radians(-90.0), 0.0, 0.0)).to_matrix() @ Vector(corner) for corner in init_bbox_corners]
        g_minx = g_maxx = init_bbox_corners[0].x
        g_miny = g_maxy = init_bbox_corners[0].y
        g_minz = g_maxz = init_bbox_corners[0].z
    else:
        g_minx = g_maxx = g_miny = g_maxy = g_minz = g_maxz = 0

    for obj in bpy.data.objects:
        if obj.type == 'MESH':

            # compute triangle count
            triangle_count = 0
            for face in obj.data.polygons:
                verts = face.vertices
                tris = len(verts)-2
                triangle_count += tris

            # fill stats structure
            statistics={}
            statistics["numFaces"] = len(obj.data.polygons)
            statistics["numTriangles"] = triangle_count
            statistics["numVertices"] = len(obj.data.vertices)
            statistics["numEdges"] = len(obj.data.edges)
            statistics["numTexCoordChannels"] = len(obj.data.uv_layers.keys())
            statistics["numColorChannels"] = len(obj.data.vertex_colors)
            statistics["hasNormals"] = obj.data.has_custom_normals
            #statistics["hasTangents"] = obj.data.loops[0].tangent is not None
            statistics["hasTexCoords"] = obj.data.uv_layers.active is not None
            statistics["hasVertexColors"] = len(obj.data.vertex_colors) > 0
            statistics["hasBones"] = obj.find_armature() is not None
            statistics["isTwoManifoldUnbounded"] = is_manifold(obj, True)
            statistics["isTwoManifoldBounded"] = is_manifold(obj, False)
            statistics["selfIntersecting"] = self_intersecting(obj)
            statistics["isWatertight"] = statistics["isTwoManifoldUnbounded"] and not statistics["selfIntersecting"]

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
            tri_count += statistics["numTriangles"]
            edge_count += statistics["numEdges"]

    scene_bounds = {
        "min" : [g_minx, g_miny, g_minz],
        "max" : [g_maxx, g_maxy, g_maxz]
    }

    scene_geometry={}
    scene_geometry["boundingBox"] = scene_bounds
    scene_geometry["center"] = [(g_minx+g_maxx)/2.0, (g_miny+g_maxy)/2.0, (g_minz+g_maxz)/2.0]
    scene_geometry["size"] = [g_maxx-g_minx, g_maxy-g_miny, g_maxz-g_minz]


    # Gather default values
    bsdf_defaults = []
    tempmat = bpy.data.materials.new("Default")
    tempmat.use_nodes = True
    node_tree = tempmat.node_tree
    temp_nodes = node_tree.nodes
    bsdf = temp_nodes.get("Principled BSDF")
    for temp_inp in bsdf.inputs:
        bsdf_defaults.append(temp_inp.default_value)
    bpy.data.materials.remove(tempmat)


    scene_materials=[]
    for key in materials:
        g_material = bpy.data.materials[key]
        channels=[]

        nodes = g_material.node_tree.nodes

        # Walk through BSDF finding values that have changed from defaults
        bsdf_node = nodes.get("Principled BSDF")
        for idx, inp in enumerate(bsdf_node.inputs):
            if(hasattr(inp.default_value, '__len__') and (not isinstance(inp.default_value, str))):
                val1 = str(inp.default_value[:])
                val2 = str(bsdf_defaults[idx][:])
                compare = val1 == val2
                val1 = val1[1:-1]
            else:
                val1 = str(inp.default_value)
                compare = inp.default_value == bsdf_defaults[idx]
            #print(inp.name)
            #print(bsdf_defaults[idx])
            #print(val1)
            if(not compare):
                if inp.name in channel_types:
                    channel = {
                    "type" : channel_names[channel_types.index(inp.name)],
                    "value" : val1
                    }
                    channels.append(channel)
                else:
                    if inp.name == "IOR":
                        channel = {
                        "type" : "reflection",
                        "ior" : val1
                        }
                        channels.append(channel)

        # Walk through texture nodes and assign/create channels
        for node in nodes:
            if node.type == 'TEX_IMAGE':
                out_channels = []
                channel_name = ""
                image_name = node.image.name
                if node.image.packed_file != None:
                    image_name = "embedded*"+node.image.name
                    if node.image.name not in embedded_textures:
                        embedded_textures.append(node.image.name)
                else:
                    if node.image.name not in textures:
                        textures.append(node.image.name)  
                find_channel(node, out_channels)
                if len(out_channels) == 0:
                    channel = {
                    "type" : "unknown",
                    "uri" : image_name
                    }
                    channels.append(channel)
                else:
                    for name in out_channels:
                        conv_name = channel_names[channel_types.index(name)]
                        channel = next((ch for ch in channels if ch["type"] == conv_name), False)
                        if channel == False:
                            channel = {
                            "type" : conv_name,
                            "uri" : image_name
                            }
                            channels.append(channel)
                        else:
                            channel["uri"] = image_name

        mat = {
            "name" : key,
            "channels" : channels
        }
        
        scene_materials.append(mat)
        
    scene_statistics =  {
        "numAnimations": len(bpy.data.actions),
        "numCameras": len(bpy.data.cameras),
        "numFaces": face_count,
        "numTriangles": tri_count,
        "numLights": len(bpy.data.lights),
        "numMaterials": len(materials),
        "numMeshes": mesh_count,
        "numLinkedTextures": len(textures),
        "numEmbeddedTextures": len(embedded_textures),
        "numVertices": vertex_count,
        "numEdges": edge_count,
        "fileEncoding": "ASCII" if isAscii else "BINARY",
        "isDracoCompressed": isDracoCompressed
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

    # If we have a draco compressed glb, re-save uncompressed for now
    if file_extension == '.glb' and isDracoCompressed == True:
        path = bpy.data.filepath
        dir = os.path.dirname(path)
        save_file = os.path.join(dir, argv[0])
        bpy.ops.export_scene.gltf(filepath=save_file, check_existing=False)

try:
    run()
except Exception as e:
    print(e)
    sys.exit(1)
    

