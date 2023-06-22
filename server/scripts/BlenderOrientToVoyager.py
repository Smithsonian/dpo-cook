import bpy
import sys
import os
import json
import bmesh
import math
import mathutils

def run():
        do_translate = False
        do_rotate = False
        do_scale = False
        scale_factor = 1.0

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

        #import scene to be reoriented
        if file_extension == '.obj':
                bpy.ops.wm.obj_import(filepath=argv[0])
        elif file_extension == '.ply':
                bpy.ops.import_mesh.ply(filepath=argv[0])
        elif file_extension == '.fbx':
                bpy.ops.import_scene.fbx(filepath=argv[0])
                

        #load and parse voyager file
        f=open(argv[1], mode="r", encoding="utf-8") 
        data=json.load(f) 
        f.close()

        #find first model for reference
        models = data['models']
        nodes = data['nodes']
        is_multi = True if len(models) > 1 else False

        if is_multi:
                bpy.ops.file.unpack_all(method="WRITE_ORIGINAL")
        
        for object in bpy.data.objects:
                model_idx = -1
                if object.type == "MESH":
                        if is_multi:
                                for idx, node in enumerate(nodes):
                                        if object.name in node['name']:
                                                model_idx = node['model']
                                                break
                        else:
                                model_idx = 0
                                
                        if model_idx > -1:                
                                model = models[model_idx]

                                if 'rotation' in model:
                                        rotation = model['rotation']
                                        do_rotate = True
                                if 'translation' in model:      
                                        translation = model['translation']
                                        do_translate = True
                                        
                                #set internal scale info
                                if argv[3].lower() in ('yes', 'true', 't', 'y', '1'):
                                        do_scale = True
                                        file_unit = model['units']
                                        if file_unit == 'mm':
                                                scale_factor = 0.001
                                        elif file_unit == 'cm':
                                                scale_factor = 0.01
                                        elif file_unit == 'in':
                                                scale_factor = 0.0254
                                        elif file_unit == 'ft':
                                                scale_factor = 0.3048
                                        elif file_unit == 'm':
                                                scale_factor = 1.0
                                
                                me = object.data
                                bm = bmesh.new()   
                                bm.from_mesh(me)  

                                matrix_world = object.matrix_world 
                                
                                # transform
                                if file_extension == '.obj':
                                        bmesh.ops.transform(bm, matrix=mathutils.Euler((math.radians(-90.0), 0.0, 0.0)).to_matrix(), space=matrix_world, verts=bm.verts) # change coordinate system
                                if do_rotate:
                                        bmesh.ops.transform(bm, matrix=mathutils.Quaternion((rotation[3], rotation[0], rotation[1], rotation[2])).to_matrix(), space=matrix_world, verts=bm.verts)
                                if do_translate: 
                                        bmesh.ops.transform(bm, matrix=mathutils.Matrix.Translation((translation[0], translation[1], translation[2])), space=matrix_world, verts=bm.verts)
                                if do_scale:
                                        bmesh.ops.scale(bm, vec=mathutils.Vector((scale_factor, scale_factor, scale_factor)), space=matrix_world, verts=bm.verts)
                                if file_extension == '.obj':
                                        bmesh.ops.transform(bm, matrix=mathutils.Euler((math.radians(90.0), 0.0, 0.0)).to_matrix(), space=matrix_world, verts=bm.verts) # return to original coordinate system
                                        
                                # write to mesh
                                bm.to_mesh(me)
                                bm.free()  
                        
        identifier = '_oriented'
        if do_scale:
                identifier = '_std'
                        
        #create save file name
        path = bpy.data.filepath
        dir = os.path.dirname(path)
        try: #check for provided output filename
                mod_filename = argv[2]
        except IndexError:
                mod_filename = filename + identifier + file_extension

        #save reoriented scene
        save_file = os.path.join(dir, mod_filename)
        if file_extension == '.obj':
                save_file = save_file.replace(".fbx",".obj")
                bpy.ops.wm.obj_export(filepath=save_file, check_existing=False, axis_forward='-Z', axis_up='Y', export_materials=True, path_mode='COPY')
        elif file_extension == '.ply':
                bpy.ops.export_mesh.ply(filepath=save_file)
        elif file_extension == '.fbx':
                bpy.ops.export_scene.fbx(filepath=save_file, check_existing=False, path_mode="COPY", embed_textures=True)

try:
    run()
except Exception as e:
        print(e)
        sys.exit(1)
